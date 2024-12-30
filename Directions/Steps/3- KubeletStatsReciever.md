# Setting Up OpenTelemetry Collector for Kubelet Stats Collection

## Introduction
This guide walks through setting up an OpenTelemetry Collector for collecting node, pod, container, and volume metrics from the Kubelet API in a Kubernetes environment. We'll use the kubeletstats receiver to collect these metrics and forward them to Dynatrace.

> **Note**: For this collector, we use the OpenTelemetry Collector Contrib image (`otel/opentelemetry-collector-contrib`) instead of the Dynatrace OpenTelemetry Collector because the kubeletstats receiver is not included in the Dynatrace distribution.

## Starting Template

```yaml:Directions/otel-templates/collecters/contrib-otel-collecter-dameonset-template.yaml
apiVersion: opentelemetry.io/v1beta1
kind: OpenTelemetryCollector
metadata:
  name: dynatrace-metrics-node
  namespace: dynatrace
spec:
  serviceAccount: collector    # Uses existing collector service account
  managementState: "managed"
  envFrom:
    - secretRef:
        name: dynatrace-otelcol-dt-api-credentials
  env:
    - name: K8S_NODE_NAME
      valueFrom:
        fieldRef:
          fieldPath: spec.nodeName
    - name: HOST_IP
      valueFrom:
        fieldRef:
          fieldPath: status.hostIP
    - name: MY_POD_IP
      valueFrom:
        fieldRef:
          apiVersion: v1
          fieldPath: status.podIP
  mode: "daemonset"
  image: "otel/opentelemetry-collector-contrib:0.103.0"
  resources:
    limits:
      memory: 512Mi
  config:
    receivers:
      kubeletstats:

    processors:
      # ... same processors as in file receiver example ...

    exporters:
      otlphttp/dynatrace:
        endpoint: "${env:DT_ENDPOINT}"
        headers:
          Authorization: "Api-Token ${env:DT_API_TOKEN}"

    service:
      pipelines:
        metrics:
          receivers: []
          processors: [k8sattributes, resourcedetection/gcp, resource, batch]
          exporters: [otlphttp/dynatrace]
```

## Step 1: Understanding Kubelet Stats

The kubeletstats receiver collects metrics from the Kubelet's stats API endpoint. This provides detailed metrics about:
- Node resources (CPU, memory, network)
- Pod resources
- Container resources
- Volume metrics

These metrics are essential for:
- Monitoring node health
- Understanding pod resource usage
- Tracking container performance
- Managing storage utilization

## Step 2: Configuring the Kubeletstats Receiver

Add the following configuration to the receivers section:

```yaml:Directions/otel-templates/collecters/contrib-otel-collecter-dameonset-template.yaml
receivers:
  kubeletstats:
    collection_interval: 20s
    auth_type: "serviceAccount"    # Use Kubernetes service account
    endpoint: "${env:HOST_IP}:10250"  # Kubelet endpoint
    insecure_skip_verify: true    # Skip certificate verification
    metric_groups:        # Specify which metric groups to collect
      - container
      - pod
      - node
      - volume
```

Key components explained:
- `collection_interval`: How often to collect metrics (20s is recommended)
- `auth_type`: Authentication method (using service account)
- `endpoint`: Kubelet API endpoint (using node's IP)
- `insecure_skip_verify`: Skip SSL verification for kubelet API
- `metric_groups`: Which types of metrics to collect

## Step 3: Adding to Pipeline

Update the service pipelines section to include the kubeletstats receiver:

```yaml:Directions/otel-templates/collecters/contrib-otel-collecter-dameonset-template.yaml
service:
  pipelines:
    metrics:
      receivers: [kubeletstats]
      processors: [k8sattributes, resourcedetection/gcp, resource, batch]
      exporters: [otlphttp/dynatrace]
```

## Here's how your complete collector configuration should look:

```yaml:Directions/otel-templates/collecters/contrib-otel-collecter-dameonset-template.yaml
apiVersion: opentelemetry.io/v1beta1
kind: OpenTelemetryCollector
metadata:
  name: dynatrace-metrics-node
  namespace: dynatrace
spec:
  serviceAccount: collector    # Uses existing collector service account
  managementState: "managed"
  envFrom:
    - secretRef:
        name: dynatrace-otelcol-dt-api-credentials
  env:
    - name: K8S_NODE_NAME
      valueFrom:
        fieldRef:
          fieldPath: spec.nodeName
    - name: HOST_IP
      valueFrom:
        fieldRef:
          fieldPath: status.hostIP
    - name: MY_POD_IP
      valueFrom:
        fieldRef:
          apiVersion: v1
          fieldPath: status.podIP
  mode: "daemonset"
  image: "otel/opentelemetry-collector-contrib:0.103.0"
  resources:
    limits:
      memory: 512Mi
  config:
    receivers:
      kubeletstats:
        collection_interval: 20s
        auth_type: "serviceAccount"
        endpoint: "${env:HOST_IP}:10250"
        insecure_skip_verify: true
        metric_groups:
          - container
          - pod
          - node
          - volume

    processors:
      # ... same processors as before ...

    exporters:
      otlphttp/dynatrace:
        endpoint: "${env:DT_ENDPOINT}"
        headers:
          Authorization: "Api-Token ${env:DT_API_TOKEN}"

    service:
      pipelines:
        metrics:
          receivers: [kubeletstats]
          processors: [k8sattributes, resourcedetection/gcp, resource, batch]
          exporters: [otlphttp/dynatrace]
```

Apply the configuration:
```bash
kubectl apply -f contrib-otel-collecter-dameonset-template.yaml
```

