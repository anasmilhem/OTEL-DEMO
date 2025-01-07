# Prerequisites for OpenTelemetry Setup

## 1. Environment Variables
First, set up the required environment variables. Make sure your Dynatrace API token has the following access scopes:
- `Ingest Events`
- `Ingest Logs`
- `Ingest Metrics`
- `Ingest OpenTelemetry traces`

### Using Bash:
```bash
export DT_ENDPOINT="https://YOUR-ENVIRONMENT-ID.live.dynatrace.com/api/v2/otlp"
export DT_API_TOKEN="YOUR-API-TOKEN"
```

### Using PowerShell:
```powershell
# For current session only
$env:DT_ENDPOINT = "https://YOUR-ENVIRONMENT-ID.live.dynatrace.com/api/v2/otlp"
$env:DT_API_TOKEN = "YOUR-API-TOKEN"
```

## 2. Install Cert Manager
1. Apply the cert-manager manifest:
   ```bash
   kubectl apply -f https://github.com/cert-manager/cert-manager/releases/download/v1.16.2/cert-manager.yaml
   ```

2. Validate the installation:
   ```bash
   kubectl get pods --namespace cert-manager
   ```
   Expected output should show cert-manager pods running.

## 3. Install OpenTelemetry Operator

1. Apply the OpenTelemetry Operator manifest:
   ```bash
   kubectl apply -f https://github.com/open-telemetry/opentelemetry-operator/releases/latest/download/opentelemetry-operator.yaml
   ```

2. Validate the installation:
   ```bash
   kubectl get pods --namespace opentelemetry-operator-system
   ```
   Expected output should show opentelemetry-operator pods running.

## 4. Create Dynatrace Secret
Create a secret containing Dynatrace credentials:

### Using Bash:
```bash
kubectl create secret generic dynatrace-otelcol-dt-api-credentials \
  --namespace dynatrace \
  --from-literal=DT_ENDPOINT=$DT_ENDPOINT \
  --from-literal=DT_API_TOKEN=$DT_API_TOKEN
```

### Using PowerShell:
```powershell
kubectl create secret generic dynatrace-otelcol-dt-api-credentials `
  --namespace dynatrace `
  --from-literal=DT_ENDPOINT=$env:DT_ENDPOINT `
  --from-literal=DT_API_TOKEN=$env:DT_API_TOKEN
```

## 5. Create RBAC Resources
Apply the RBAC configuration for collectors:
```bash
# Using direct GitHub URL
kubectl apply -f https://raw.githubusercontent.com/anasmilhem/OTEL-DEMO/main/k8s/otel-collector/rbac.yaml
```
The RBAC configuration grants necessary permissions for OpenTelemetry collectors to access Kubernetes resources. This is essential for collecting metrics, logs, and events from the cluster.





   


