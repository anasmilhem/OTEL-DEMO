# Setting Up OpenTelemetry Collector for Kubernetes Events and Cluster Metrics

## Introduction
This guide walks through setting up an OpenTelemetry Collector for collecting Kubernetes events and cluster-level metrics. Unlike our previous collectors that run as DaemonSets, this collector runs as a Deployment (gateway pattern) since we only need one instance to collect cluster-wide information.

> **Note**: We use the OpenTelemetry Collector Contrib image (`otel/opentelemetry-collector-contrib`) as these receivers are not included in the Dynatrace distribution.

## Starting Template

```yaml:Directions/otel-templates/collecters/contrib-otel-collecter-deployment-template.yaml
apiVersion: opentelemetry.io/v1beta1
kind: OpenTelemetryCollector
metadata:
  name: dynatrace-events
  namespace: dynatrace
spec:
  serviceAccount: collector
  managementState: "managed"
  env:
    - name: MY_POD_IP
      valueFrom:
        fieldRef:
          apiVersion: v1
          fieldPath: status.podIP
  envFrom:
    - secretRef:
        name: dynatrace-otelcol-dt-api-credentials
  mode: "deployment"
  image: "otel/opentelemetry-collector-contrib:0.103.0"
  resources:
    limits:
      memory: 512Mi
  config:
    receivers:
      # Receivers will be configured in the following steps

    processors:
      # ... same processors as before ...

    exporters:
      otlphttp/dynatrace:
        endpoint: "${env:DT_ENDPOINT}"
        headers:
          Authorization: "Api-Token ${env:DT_API_TOKEN}"

    service:
      pipelines:
        logs:
          receivers: []
          processors: [resourcedetection/gcp, resource, k8sattributes, batch]
          exporters: [otlphttp/dynatrace]
        metrics:
          receivers: []
          processors: [resourcedetection/gcp, resource, k8sattributes, batch]
          exporters: [otlphttp/dynatrace]
```

## Understanding Deployment vs DaemonSet
For this collector, we use a Deployment because:
- We only need one instance to monitor cluster-wide resources
- Events and cluster metrics are not node-specific
- Reduces resource usage compared to running on every node
- Follows the gateway pattern for cluster-wide monitoring

## Step 1: K8s Objects Receiver

The k8s_objects receiver collects information about Kubernetes resources and their states. Add this to your receivers section:

```yaml:Directions/otel-templates/collecters/contrib-otel-collecter-deployment-template.yaml
receivers:
  k8s_objects:
    auth_type: serviceAccount
    objects:
      # Core resources
      - name: pods
      - name: nodes
      - name: namespaces
      # Workload resources
      - name: deployments
      - name: daemonsets
      - name: statefulsets
      - name: replicasets
      # Network resources
      - name: services
      - name: ingresses
      # Storage resources
      - name: persistentvolumes
      - name: persistentvolumeclaims
      # Configuration resources
      - name: configmaps
      - name: secrets
    mode: pull    # Pull mode for better performance
    collection_interval: 1m
```

Key components explained:
- `auth_type`: Uses the collector's service account
- `objects`: List of Kubernetes resources to monitor
- `mode`: Pull mode is more efficient than watch mode
- `collection_interval`: How often to collect object states

## Step 2: K8s Cluster Metrics Receiver

The k8s_cluster receiver collects cluster-level metrics. Add this to your receivers section:

```yaml:Directions/otel-templates/collecters/contrib-otel-collecter-deployment-template.yaml
receivers:
  k8s_cluster:
    auth_type: serviceAccount
    collection_interval: 30s
    node_conditions_to_report:
      - Ready
      - MemoryPressure
      - DiskPressure
    allocation_metrics: true
    metadata_exporters: [k8sattributes]
```

Key components explained:
- `collection_interval`: How often to collect metrics
- `node_conditions_to_report`: Which node conditions to monitor
- `allocation_metrics`: Enable resource allocation metrics
- `metadata_exporters`: Integration with k8sattributes processor

## Step 3: Adding to Pipeline

Update the service pipelines section to include both receivers:

```yaml:Directions/otel-templates/collecters/contrib-otel-collecter-deployment-template.yaml
service:
  pipelines:
    logs:
      receivers: [k8sobjects/events]    # K8s objects are ingested as logs
      processors: [resourcedetection/gcp, resource, k8sattributes, batch]
      exporters: [otlphttp/dynatrace]
    metrics:
      receivers: [k8s_cluster]          # Cluster metrics as metrics
      processors: [resourcedetection/gcp, resource, k8sattributes, batch]
      exporters: [otlphttp/dynatrace]
```

## Types of Metrics Collected

### K8s Objects Receiver Collects:
- Object counts by type
- Object states and conditions
- Resource versions
- Creation/deletion timestamps
- Labels and annotations
- Spec and status information

### K8s Cluster Receiver Collects:
- Node status and conditions
- Resource allocation metrics
- Quota usage
- Cluster capacity metrics
- Workload distribution stats

Apply the configuration:
```bash
kubectl apply -f contrib-otel-collecter-deployment-template.yaml
```


## Complete Final Configuration

Here's how your complete collector configuration should look:

```yaml:Directions/otel-templates/collecters/contrib-otel-collecter-deployment-template.yaml
apiVersion: opentelemetry.io/v1beta1
kind: OpenTelemetryCollector
metadata:
  name: dynatrace-events
  namespace: dynatrace
spec:
  serviceAccount: collector
  managementState: "managed"
  env:
    - name: MY_POD_IP
      valueFrom:
        fieldRef:
          apiVersion: v1
          fieldPath: status.podIP
  envFrom:
    - secretRef:
        name: dynatrace-otelcol-dt-api-credentials
  mode: "deployment"
  image: "otel/opentelemetry-collector-contrib:0.103.0"
  observability:
    metrics:
      enableMetrics: true
  resources:
    limits:
      memory: 512Mi
  config:
    receivers:
      k8sobjects/events:
        auth_type: "serviceAccount"
        objects:
          - name: events
            mode: watch
            namespaces: [otel-demo, custom-otel-app]
      k8s_cluster:
        auth_type: "serviceAccount"
        collection_interval: 60s
        node_conditions_to_report: ["Ready", "MemoryPressure", "DiskPressure"]
        allocatable_types_to_report: ["cpu", "memory"]
        metadata_collection_interval: 5m

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
          - key: telemetry.sdk.name
            value: opentelemetry
            action: insert
          - key: dynatrace.otel.collector
            value: dynatrace-events
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
            - tag_name: app.label.component
              key: app.kubernetes.io/component
              from: pod
        pod_association:
          - sources:
              - from: resource_attribute
                name: k8s.pod.uid
          - sources:
              - from: resource_attribute
                name: k8s.pod.name
          - sources:
              - from: connection

    exporters:
      otlphttp/dynatrace:
        endpoint: "${env:DT_ENDPOINT}"
        headers:
          Authorization: "Api-Token ${env:DT_API_TOKEN}"

      pipelines:
        logs:
          receivers: [k8sobjects/events]
          processors: [resourcedetection/gcp, resource, k8sattributes, batch]
          exporters: [otlphttp/dynatrace]
        metrics:
          receivers: [k8s_cluster]
          processors: [resourcedetection/gcp, resource, k8sattributes, batch]
          exporters: [otlphttp/dynatrace]
```


## Note: Deployment vs DaemonSet Collectors
You can run both types of collectors in your cluster:
- DaemonSet collectors for node-specific metrics (like kubeletstats)
- Deployment collectors for cluster-wide monitoring (like k8s_objects and k8s_cluster)

This separation of concerns allows for better resource utilization and more focused monitoring responsibilities.
