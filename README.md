# OpenTelemetry Training Environment

## Getting Started

1. Click the "Code" button on this repository
2. Select "Open with Codespaces"
3. Click "New codespace"

The environment will automatically:
- Set up a Kubernetes cluster
- Create necessary namespaces
- Deploy the demo application
- Configure development tools

The demo application will be available at http://localhost:8080

## Training Steps

During the training, you'll learn how to:
1. Deploy the OpenTelemetry Collector
   - Configure the collector deployment
   - Set up the collector DaemonSet
2. Configure RBAC for OpenTelemetry
   - Create service accounts
   - Set up roles and role bindings
3. Add OpenTelemetry instrumentation
   - Configure the collector
   - Set up telemetry pipelines
   - Observe the collected data

## What's Included

- Fully configured Kubernetes environment (minikube)
- Demo application (without OpenTelemetry)
- VS Code with Kubernetes tools
- All necessary CLI tools:
  - kubectl
  - helm
  - minikube

## Troubleshooting

If you encounter any issues with the environment:
1. Try running `~/scripts/setup.sh` to restart the setup
2. Check running pods: `kubectl get pods -n otel-demo`
3. Check minikube status: `minikube status`
4. Access the dashboard: `minikube dashboard`

## Resource Usage

This environment is configured to use:
- 4GB RAM
- 2 CPU cores

If you need more resources, you can adjust these in the setup script. 