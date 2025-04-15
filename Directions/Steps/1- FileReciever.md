# Setting Up OpenTelemetry Collector for Log Collection

## Introduction
This guide walks through setting up an OpenTelemetry Collector for log collection in a Kubernetes environment, with a focus on collecting container logs using the filelog receiver and forwarding them to Dynatrace.

You can pull the starting template directly from GitHub using:

```bash
kubectl apply -f https://raw.githubusercontent.com/anasmilhem/OTEL-DEMO/main/Directions/otel-templates/collecters/dynatrace-otel-collecter-daemonset-template.yaml
```

## Starting Template

```yaml:Directions/otel-templates/collecters/dynatrace-otel-collecter-daemonset-template.yaml

apiVersion: opentelemetry.io/v1beta1
kind: OpenTelemetryCollector
metadata:
  name: dynatrace-logs
  namespace: dynatrace
spec:
  managementState: "managed"
  serviceAccount: collector
  envFrom:
    - secretRef:
        name: dynatrace-otelcol-dt-api-credentials
  env:
    - name: KUBE_NODE_NAME
      valueFrom:
        fieldRef:
          apiVersion: v1
          fieldPath: spec.nodeName
    - name: MY_POD_IP
      valueFrom:
        fieldRef:
          apiVersion: v1
          fieldPath: status.podIP
  mode: "daemonset"
  image: "ghcr.io/dynatrace/dynatrace-otel-collector/dynatrace-otel-collector:latest"
  resources:
    limits:
      memory: 1024Mi
  config:
    receivers:
      # We will add receivers during training

    processors:
      # We will add processors during training

    exporters:
      otlphttp/dynatrace:
        endpoint: "${env:DT_ENDPOINT}"
        headers:
          Authorization: "Api-Token ${env:DT_API_TOKEN}"

    service:
      pipelines:
        logs:
          receivers: [] # We will add receivers here
          processors: [] # We will add processors here
          exporters: [otlphttp/dynatrace]

```

## Step 1: Adding File Access
First, we need to give the collector access to container log files on the host:

```yaml:Directions/otel-templates/collecters/dynatrace-otel-collecter-daemonset-template.yaml
spec:
  volumes:
    - name: varlogpods
      hostPath:
        path: /var/log/pods
    - name: varlogcontainers
      hostPath:
        path: /var/log/containers
  volumeMounts:
    - name: varlogpods
      mountPath: /var/log/pods
      readOnly: true
    - name: varlogcontainers
      mountPath: /var/log/containers
      readOnly: true
```

### Understanding Log Storage in Kubernetes
Kubernetes stores container logs in a structured directory format on each node:
```
/var/log/pods/<namespace>_<pod-name>_<pod-uid>/<container-name>/<restart-count>.log
```

For example:
```
/var/log/pods/default_nginx-748c667d99-abcd_12345678-abcd-efgh-ijkl-mnopqrstuvwx/nginx/0.log
```

This path contains important metadata:
- Namespace: `default`
- Pod name: `nginx-748c667d99-abcd`
- Pod UID: `12345678-abcd-efgh-ijkl-mnopqrstuvwx`
- Container name: `nginx`
- Restart count: `0`

Inside these files, the actual log content is formatted according to the container runtime (containerd/CRI-O/Docker), but the filepath itself provides valuable Kubernetes metadata that we'll extract later.

## Step 2: Adding the Filelog Receiver
The filelog receiver is a powerful component that reads and parses log files:

```yaml:Directions/otel-templates/collecters/dynatrace-otel-collecter-daemonset-template.yaml
receivers:
  filelog:
    include:
      - /var/log/pods/*/*/*.log
    exclude:
      - /var/log/pods/*/otc-container/*.log
    start_at: beginning
    include_file_path: true
    include_file_name: false
```

Key components explained:
- `include`: Pattern matching for log files to collect (matches the Kubernetes log directory structure)
- `exclude`: Pattern matching for logs to ignore (prevents collecting the collector's own logs)
- `start_at`: Determines where to start reading (beginning or end of file)
- `include_file_path`: Includes the full file path, needed for extracting Kubernetes metadata later
- `include_file_name`: We don't need the filename as the path already contains the information we need



## Step 3: Understanding Container Runtime Log Formats

Different container runtimes format their logs differently. In Kubernetes environments, you might encounter logs from these runtimes:

### Container Runtime Log Formats

1. **Containerd** (Default in modern Kubernetes)
   ```
   2024-03-20T10:30:45.123456789Z stdout P Hello World
   ```
   - Starts with ISO timestamp ending in 'Z'
   - Followed by stream type (stdout/stderr)
   - Simple space-separated format

2. **CRI-O** (Used in OpenShift and some other distributions)
   ```
   2024-03-20T10:30:45.123456789+00:00 stdout P Hello World
   ```
   - Similar to containerd but timestamp includes timezone offset
   - Used by OpenShift and some other Kubernetes distributions

3. **Docker** (Legacy format)
   ```json
   {
     "time": "2024-03-20T10:30:45.123456789Z",
     "stream": "stdout",
     "log": "Hello World"
   }
   ```
   - JSON formatted
   - Contains structured fields
   - Legacy format, less common in modern Kubernetes

### Implementing the Parsers

First, we use a router to detect the format:

```yaml:Directions/otel-templates/collecters/dynatrace-otel-collecter-daemonset-template.yaml
operators:
  - type: router
    id: get-format
    routes:
      - output: parser-docker
        expr: 'body matches "^\\{"'         # Matches JSON format (Docker)
      - output: parser-crio
        expr: 'body matches "^[^ Z]+ "'     # Matches CRI-O format
      - output: parser-containerd
        expr: 'body matches "^[^ Z]+Z"'     # Matches containerd format
```

Then we implement specific parsers for each format:

```yaml:Directions/otel-templates/collecters/dynatrace-otel-collecter-daemonset-template.yaml
  # Containerd format (most common in modern Kubernetes)
  - type: regex_parser
    id: parser-containerd
    regex: "^(?P<time>[^ ^Z]+Z) (?P<stream>stdout|stderr) (?P<logtag>[^ ]*) ?(?P<log>.*)$"
    output: extract_metadata_from_filepath
    timestamp:
      parse_from: attributes.time
      layout: "%Y-%m-%dT%H:%M:%S.%LZ"

  # CRI-O format
  - type: regex_parser
    id: parser-crio
    regex: "^(?P<time>[^ Z]+) (?P<stream>stdout|stderr) (?P<logtag>[^ ]*) ?(?P<log>.*)$"
    output: extract_metadata_from_filepath
    timestamp:
      parse_from: attributes.time
      layout_type: gotime
      layout: "2006-01-02T15:04:05.999999999Z07:00"

  # Docker format
  - type: json_parser
    id: parser-docker
    output: extract_metadata_from_filepath
    timestamp:
      parse_from: attributes.time
      layout: "%Y-%m-%dT%H:%M:%S.%LZ"
```

### Why Multiple Parsers?

1. **Backwards Compatibility**: While containerd is the default in modern Kubernetes (v1.24+), some clusters might still use different runtimes or older versions.

2. **Distribution Differences**: Different Kubernetes distributions might use different container runtimes:
   - Standard Kubernetes → containerd
   - OpenShift → CRI-O
   - Legacy systems → might still have Docker

3. **Migration Support**: Organizations migrating between different Kubernetes versions or distributions need support for multiple formats.

## Step 5: Metadata Extraction
Extract Kubernetes metadata from the file path:

```yaml:Directions/otel-templates/collecters/dynatrace-otel-collecter-daemonset-template.yaml
  - type: regex_parser
    id: extract_metadata_from_filepath
    regex: '^.*\/(?P<namespace>[^_]+)_(?P<pod_name>[^_]+)_(?P<uid>[a-f0-9\-]{36})\/(?P<container_name>[^\._]+)\/(?P<restart_count>\d+)\.log$'
    parse_from: attributes["log.file.path"]
```

This extracts:
- Namespace
- Pod name
- Pod UID
- Container name
- Restart count

## Step 6: Attribute Standardization
After parsing logs and extracting metadata, we need to rename attributes to follow OpenTelemetry semantic conventions:

```yaml:Directions/otel-templates/collecters/dynatrace-otel-collecter-daemonset-template.yaml
# Move parsed fields to standard OpenTelemetry attribute names
- type: move
  from: attributes.log
  to: body                                    # Main log content goes to body
- type: move
  from: attributes.stream
  to: attributes["log.iostream"]              # stdout/stderr
- type: move
  from: attributes.container_name
  to: resource["k8s.container.name"]          # Container name as k8s resource
- type: move
  from: attributes.namespace
  to: resource["k8s.namespace.name"]          # Namespace as k8s resource
- type: move
  from: attributes.pod_name
  to: resource["k8s.pod.name"]               # Pod name as k8s resource
- type: move
  from: attributes.restart_count
  to: resource["k8s.container.restart_count"] # Container restart count
- type: move
  from: attributes.uid
  to: resource["k8s.pod.uid"]                # Pod UID as k8s resource

# Remove redundant attributes
- type: remove
  field: attributes.log      # Already moved to body
- type: remove
  field: attributes.logtag   # Not needed
- type: remove
  field: attributes.time     # Timestamp already processed
```

```bash
kubectl apply -f dynatrace-otel-collecter-daemonset-template.yaml
```

### Why Standardize Attributes?

1. **OpenTelemetry Compliance**: 
   - OpenTelemetry defines [semantic conventions](https://opentelemetry.io/docs/specs/semconv/) for attribute naming
   - Standard names ensure consistency across different systems
   - Makes it easier to process logs in different backends

2. **Resource vs Attributes**:
   - `resource.*`: Describes the source of the logs (container, pod, namespace)
   - `attributes.*`: Describes properties of individual log entries
   - This separation helps with filtering and aggregation

3. **Optimization**:
   - Removes redundant fields to reduce data volume
   - Moves log content to standard `body` field
   - Removes processed fields like timestamp that are no longer needed

4. **Backend Compatibility**:
   - Dynatrace and other observability platforms expect certain attribute patterns
   - Standard naming helps with automatic processing and visualization
   - Enables better correlation between logs, metrics, and traces

## Step 7: k8sattributes Processor

The k8sattributes processor enriches logs with Kubernetes metadata. Here's the configuration:

```yaml:Directions/otel-templates/collecters/dynatrace-otel-collecter-daemonset-template.yaml
processors:
  k8sattributes:
    auth_type: "serviceAccount"
    passthrough: false
    filter:
      node_from_env_var: KUBE_NODE_NAME
    extract:
      metadata:
        - k8s.namespace.name
        - k8s.deployment.name
        - k8s.daemonset.name
        - k8s.pod.name
        - k8s.pod.uid
        - k8s.node.name
        - k8s.container.name
        - container.id
        - container.image.name
        - container.image.tag
    labels:
      # Extract Kubernetes labels as attributes
      - tag_name: app.label.component
        key: app.kubernetes.io/component
        from: pod
    pod_association:
      # Define how to associate logs with pods (order matters)
      - sources:
          - from: resource_attribute
            name: k8s.pod.uid      # First try using pod UID
      - sources:
          - from: resource_attribute
            name: k8s.pod.name     # Then try using pod name
      - sources:
          - from: connection       # Last resort: use connection info
```

### Key Components

#### 1. Authentication
- Uses the collector's service account to authenticate with the Kubernetes API
- Needs RBAC permissions to read pod metadata
- Required for accessing pod details beyond what's in the log files

#### 2. Filter and Passthrough Settings
```yaml:Directions/otel-templates/collecters/dynatrace-otel-collecter-daemonset-template.yaml
passthrough: false    # Don't use simplified IP-only mode
filter:
  node_from_env_var: KUBE_NODE_NAME    # Only process logs from this node
```
- **passthrough**: Controls how the processor enriches metadata
  - `false` (Normal Mode): 
    - Full metadata enrichment using K8s API
    - Requires cluster API access
    - Adds complete pod, deployment, and container information
  
  - `true` (Simplified Mode):
    - Only annotates resources with pod IP
    - Doesn't require K8s API access
    - Only works when receiving logs directly from services
    - Limited metadata compared to normal mode

- **filter**: Limits which pods the processor looks up
  - `node_from_env_var`: Only processes logs from the current node
  - Improves performance by reducing API calls
  - Prevents unnecessary lookups for pods on other nodes

#### 3. Metadata Extraction
- Enriches logs with additional Kubernetes metadata
- Gets information not available in log files (like deployment names)
- Extracts container details from the Kubernetes API

#### 4. Label Extraction
- Extracts specific Kubernetes labels as attributes
- Example shows extracting the `app.kubernetes.io/component` label
- Helps with filtering and grouping logs by application components

#### 5. Pod Association
The processor needs a way to identify which pod the log came from. It tries these methods in order:

1. **Pod UID** (Most Reliable)
   - If the log has a pod UID attribute
   - This is unique across the cluster
   - Never reused, even if pod is recreated

2. **Pod Name** (Fallback)
   - If pod UID isn't available
   - Less reliable as names can be reused
   - Must be combined with namespace

3. **Connection** (Last Resort)
   - If no pod identifiers are available
   - Uses the IP address of the connection
   - Least reliable as IPs can be reused

### Why This Matters
Without at least one of these identifiers, the processor cannot enrich the logs with additional Kubernetes metadata. This is why we:
1. Extract pod metadata from file paths
2. Preserve it during parsing
3. Convert it to standard OpenTelemetry attributes
4. Then let k8sattributes add more context

```bash
kubectl apply -f dynatrace-otel-collecter-daemonset-template.yaml
```

## Step 8: Additional Processors

### Batch Processor
```yaml:Directions/otel-templates/collecters/dynatrace-otel-collecter-daemonset-template.yaml
processors:
  batch:
    send_batch_max_size: 2000    # Maximum number of logs in a batch
    timeout: 30s                 # Maximum time to wait before sending
    send_batch_size: 1500        # Target number of logs per batch
```

The batch processor:
- Groups logs together for efficient sending
- Reduces network overhead
- Improves throughput
- Balances latency vs efficiency

### Resource Processor
```yaml:Directions/otel-templates/collecters/dynatrace-otel-collecter-daemonset-template.yaml
processors:
  resource:
    attributes:
      - key: k8s.pod.ip
        action: delete                    # Remove pod IP (not needed)
      - key: k8s.cluster.name
        value: anas-otel                 # Add cluster name
        action: insert
      - key: dt.security_context
        from_attribute: k8s.cluster.name  # Copy cluster name to 
        action: insert
```

The resource processor:
- Modifies resource attributes
- Adds cluster identification
- Sets up security context
- Removes unnecessary attributes

### Attributes Processor
```yaml:Directions/otel-templates/collecters/dynatrace-otel-collecter-daemonset-template.yaml
processors:
  attributes:
    actions:
      - key: telemetry.sdk.name
        value: opentelemetry
        action: insert
      - key: dynatrace.otel.collector
        value: dynatrace-logs
        action: insert
```

The attributes processor:
- Adds standard OpenTelemetry attributes
- Identifies the collector instance
- Helps with telemetry identification
- Enables better filtering in Dynatrace

### Resource Detection Processor
```yaml:Directions/otel-templates/collecters/dynatrace-otel-collecter-daemonset-template.yaml
processors:
  resourcedetection/gcp:
    detectors: [env, gcp]    # Use environment and GCP metadata
    timeout: 2s              # Maximum time for detection
    override: false          # Don't override existing attributes
```

The resource detection processor:
- Automatically detects cloud environment
- Adds cloud platform metadata
- Enriches logs with infrastructure context
- Supports multiple cloud providers



## Step 9: Configuring Multiple Log Collection Pipelines

### Filelog Pipeline
```yaml:Directions/otel-templates/collecters/dynatrace-otel-collecter-daemonset-template.yaml
service:
  pipelines:
    logs/filelog:
      receivers: [filelog]
      processors: 
        - k8sattributes
        - resourcedetection/gcp
        - resource
        - attributes
        - batch
      exporters: [otlphttp/dynatrace]
```

### OTLP Receiver for Application Logs
The collector can also receive logs directly from applications using the OpenTelemetry SDK. These logs use the same processors for consistent enrichment:

```yaml:Directions/otel-templates/collecters/dynatrace-otel-collecter-daemonset-template.yaml
receivers:
  otlp:
    protocols:
      grpc:
        endpoint: 0.0.0.0:4317
      http:
        endpoint: 0.0.0.0:4318

service:
  pipelines:
    logs:
      receivers: [otlp]
      processors: 
        - k8sattributes
        - resourcedetection/gcp
        - resource
        - attributes
        - batch
      exporters: [otlphttp/dynatrace]
```

Applications can send logs to:
- gRPC endpoint: `http://collector:4317`
- HTTP endpoint: `http://collector:4318`

```bash
kubectl apply -f dynatrace-otel-collecter-daemonset-template.yaml
```

## Step 10: Forwarding Logs to DaemonSet Collector

### 1. Update Collector Configuration
First, modify the `k8s/otel-demo-app/collecter-values.yaml`:

```yaml:k8s/otel-demo-app/collecter-values.yaml
opentelemetry-collector:
  config:
    exporters:
      otlphttp:
        endpoint: http://dynatrace-logs-collector.dynatrace.svc.cluster.local:4318

    service:
      pipelines:
        traces:
          receivers: [otlp]
          processors: [memory_limiter, resource, batch]
          exporters: [otlphttp]
        metrics:
          receivers: [httpcheck/frontendproxy, otlp, spanmetrics]
          processors: [memory_limiter, resource, batch]
          exporters: [otlphttp]
        logs:
          processors: [memory_limiter, resource, batch]
          exporters: [otlphttp]
```

The endpoint format breaks down as:
- `dynatrace-logs-collector`: Name of the DaemonSet collector service
- `dynatrace`: Namespace where the collector runs
- `svc.cluster.local`: Kubernetes internal DNS suffix
- `4318`: Standard OTLP HTTP port

### 2. Update the Helm Deployment
After updating the configuration, apply the changes using Helm:
```bash
helm upgrade my-otel-demo open-telemetry/opentelemetry-demo \
    --version 0.32.8 \
    --values k8s/otel-demo-app/collecter-values.yaml \
    --namespace otel-demo
```

### Understanding the Multi-Collector Architecture

1. **Deployment Collector** (This collector)
   - Runs as a deployment (one or more replicas)
   - Receives logs via OTLP from applications
   - Acts as an aggregation point
   - Forwards to the DaemonSet collector

2. **DaemonSet Collector** (Target collector)
   - Runs on every node
   - Collects container logs from files
   - Has direct access to Dynatrace credentials
   - Handles final export to Dynatrace

### Benefits of This Architecture

1. **Security**
   - Only DaemonSet collectors need Dynatrace credentials
   - Applications only need to know about local collectors
   - Reduces credential exposure

2. **Flexibility**
   - Applications use standard OTLP endpoints
   - Easy to change backend without updating applications
   - Can add processing layers as needed

3. **Resource Efficiency**
   - Local collection reduces network overhead
   - Batching at multiple levels
   - Optimized API calls to Dynatrace

### Example Flow
1. Application → Sends logs to Deployment collector (OTLP)
2. Deployment collector → Processes and forwards to DaemonSet collector
3. DaemonSet collector → Processes and forwards to Dynatrace


## Here is how your Dynatrace Daemonset Collecter Yaml file should look like by now 

```yaml:Directions/otel-templates/collecters/dynatrace-otel-collecter-daemonset-template.yaml
apiVersion: opentelemetry.io/v1beta1
kind: OpenTelemetryCollector
metadata:
  name: dynatrace-logs
  namespace: dynatrace
spec:
  managementState: "managed"
  serviceAccount: collector
  envFrom:
    - secretRef:
        name: dynatrace-otelcol-dt-api-credentials
  env: # Add this section
    - name: KUBE_NODE_NAME # Add this environment variable
      valueFrom:
        fieldRef:
          apiVersion: v1
          fieldPath: spec.nodeName
    - name: MY_POD_IP
      valueFrom:
        fieldRef:
          apiVersion: v1
          fieldPath: status.podIP
  mode: "daemonset"
  image: "ghcr.io/dynatrace/dynatrace-otel-collector/dynatrace-otel-collector:latest"
  resources:
    limits:
      memory: 1024Mi
  # mount host log directories to the otel collector container(s)
  volumes:
    - name: varlogpods
      hostPath:
        path: /var/log/pods
    - name: varlogcontainers
      hostPath:
        path: /var/log/containers
  volumeMounts:
    - name: varlogpods
      mountPath: /var/log/pods
      readOnly: true
    - name: varlogcontainers
      mountPath: /var/log/containers
      readOnly: true
  #
  config:
    receivers:
      otlp:
        protocols:
          grpc:
            endpoint: 0.0.0.0:4317
          http:
            endpoint: 0.0.0.0:4318
      filelog:
        include:
          - /var/log/pods/*/*/*.log
        exclude:
          - /var/log/pods/*/otc-container/*.log
          # - /var/log/pods/custom-otel-app_*/*/*.log
        start_at: beginning
        include_file_path: true
        include_file_name: false
        operators:

          - type: router
            id: get-format
            routes:
              - output: parser-docker
                expr: 'body matches "^\\{"'
              - output: parser-crio
                expr: 'body matches "^[^ Z]+ "'
              - output: parser-containerd
                expr: 'body matches "^[^ Z]+Z"'
          # Parse CRI-O format
          - type: regex_parser
            id: parser-crio
            regex:
              "^(?P<time>[^ Z]+) (?P<stream>stdout|stderr) (?P<logtag>[^ ]*)
              ?(?P<log>.*)$"
            output: extract_metadata_from_filepath
            timestamp:
              parse_from: attributes.time
              layout_type: gotime
              layout: "2006-01-02T15:04:05.999999999Z07:00"
          # Parse CRI-Containerd format
          - type: regex_parser
            id: parser-containerd
            regex:
              "^(?P<time>[^ ^Z]+Z) (?P<stream>stdout|stderr) (?P<logtag>[^ ]*)
              ?(?P<log>.*)$"
            output: extract_metadata_from_filepath
            timestamp:
              parse_from: attributes.time
              layout: "%Y-%m-%dT%H:%M:%S.%LZ"
          # Parse Docker format
          - type: json_parser
            id: parser-docker
            output: extract_metadata_from_filepath
            timestamp:
              parse_from: attributes.time
              layout: "%Y-%m-%dT%H:%M:%S.%LZ"

          # Extract metadata from file path
          - type: regex_parser
            id: extract_metadata_from_filepath
            regex: '^.*\/(?P<namespace>[^_]+)_(?P<pod_name>[^_]+)_(?P<uid>[a-f0-9\-]{36})\/(?P<container_name>[^\._]+)\/(?P<restart_count>\d+)\.log$'
            parse_from: attributes["log.file.path"]
            cache:
              size: 128 # default maximum amount of Pods per Node is 110
          # Rename attributes
          - type: move
            from: attributes.log
            to: body
          - type: move
            from: attributes.stream
            to: attributes["log.iostream"]
          - type: move
            from: attributes.container_name
            to: resource["k8s.container.name"]
          - type: move
            from: attributes.namespace
            to: resource["k8s.namespace.name"]
          - type: move
            from: attributes.pod_name
            to: resource["k8s.pod.name"]
          - type: move
            from: attributes.restart_count
            to: resource["k8s.container.restart_count"]
          - type: move
            from: attributes.uid
            to: resource["k8s.pod.uid"]
          # Remove unwanted attributes
          - type: remove
            field: attributes.log # duplicate value of content/body
          - type: remove
            field: attributes.logtag # always the same value
          - type: remove
            field: attributes.time # duplicate value of timestamp

    processors:
      batch:
        send_batch_max_size: 2000
        timeout: 30s
        send_batch_size: 1500
      resource:
        attributes:
          - key: k8s.pod.ip
            action: delete
          - key: k8s.cluster.name
            value: anas-otel
            action: insert
          - key: dt.security_context
            from_attribute: k8s.cluster.name
            action: insert
      attributes:
        actions:
          - key: telemetry.sdk.name
            value: opentelemetry
            action: insert
          - key: dynatrace.otel.collector
            value: dynatrace-logs
            action: insert
      resourcedetection/gcp:
        detectors: [env, gcp]
        timeout: 2s
        override: false
      k8sattributes:
        auth_type: "serviceAccount"
        passthrough: false
        filter:
          node_from_env_var: KUBE_NODE_NAME
        extract:
          metadata:
            - k8s.namespace.name
            - k8s.deployment.name
            - k8s.daemonset.name
            - k8s.job.name
            - k8s.cronjob.name
            - k8s.replicaset.name
            - k8s.statefulset.name
            - k8s.pod.name
            - k8s.pod.uid
            - k8s.node.name
            - k8s.container.name
            - container.id
            - container.image.name
            - container.image.tag
          labels:
            # Extracts the value of a namespaces label with key `label1` and inserts it as a resource attribute with key `l1`
            - tag_name: app.label.component
              key: app.kubernetes.io/component
              from: pod
        pod_association: # How to associate the data to a pod (order matters)
          - sources: # First try to use the value of the resource attribute k8s.pod.ip
              - from: resource_attribute
                name: k8s.pod.uid
          - sources: # Then try to use the value of the resource attribute k8s.pod.uid
              - from: resource_attribute
                name: k8s.pod.name
          - sources: # If neither of those work, use the request's connection to get the pod IP.
              - from: connection

    exporters:
      otlphttp/dynatrace:
        endpoint: "${env:DT_ENDPOINT}"
        headers:
          Authorization: "Api-Token ${env:DT_API_TOKEN}"
  
    service:
      pipelines:
        logs/otlp:
          receivers: [otlp]
          processors:
            [k8sattributes, resourcedetection/gcp, resource, attributes, batch]
          exporters: [otlphttp/dynatrace, debug]
        logs/filelog:
          receivers: [filelog]
          processors:
            [k8sattributes, resourcedetection/gcp, resource, attributes, batch]
          exporters: [otlphttp/dynatrace]
```

## Note: Multiple Pipelines for Same Telemetry Type
You can create multiple pipelines for the same telemetry type by adding a suffix after a forward slash. For example:

```yaml:Directions/otel-templates/collecters/dynatrace-otel-collecter-daemonset-template.yaml
service:
  pipelines:
    logs/otlp:     # First logs pipeline for OTLP data
      receivers: [otlp]
      processors: [k8sattributes, resourcedetection/gcp, resource, attributes, batch]
      exporters: [otlphttp/dynatrace, debug]
    logs/filelog:   # Second logs pipeline for file-based logs
      receivers: [filelog]
      processors: [k8sattributes, resourcedetection/gcp, resource, attributes, batch]
      exporters: [otlphttp/dynatrace]
```

This pattern (`telemetry-type/name`) allows you to:
- Create multiple specialized pipelines for the same telemetry type
- Use different receivers, processors, or exporters for each pipeline
- Process different sources of the same telemetry type separately
- Apply different processing rules to different sources


Common use cases include:
- Separating application logs from infrastructure logs
- Applying different processing rules to different log sources
- Sending different types of logs to different destinations
- Having different batching configurations for different sources



## Apply the Complete Collecter Configuration

If you've had any issues following along, you can apply the complete final configuration directly:

```bash
kubectl apply -f https://raw.githubusercontent.com/anasmilhem/OTEL-DEMO/main/k8s/otel-collector/dynatrace-otel-collector-daemonset-logs.yaml
```


