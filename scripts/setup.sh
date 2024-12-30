#!/bin/bash
set -e

echo "Starting setup..."

# Start minikube with docker driver
minikube start --driver=docker

# Add helm repo
helm repo add open-telemetry https://open-telemetry.github.io/opentelemetry-helm-charts
helm repo update

# Create namespace
kubectl create namespace otel-demo || true  # Added || true to prevent failure if namespace exists

echo "Setup completed successfully!"









# #!/bin/bash
# set -e

# echo "🚀 Starting Training Environment Setup..."

# # Function to wait for a specific kubernetes resource
# wait_for_resource() {
#     local namespace=$1
#     local resource_type=$2
#     local label=$3
#     echo "⏳ Waiting for $resource_type in namespace $namespace..."
#     kubectl wait --for=condition=ready $resource_type -l $label -n $namespace --timeout=300s
# }

# # Function to show setup progress
# show_progress() {
#     echo "✨ $1"
# }

# # Start minikube if not running
# if ! minikube status >/dev/null 2>&1; then
#     show_progress "Starting minikube cluster..."
#     minikube start --memory=4096 --cpus=2
# fi

# # Create namespaces
# show_progress "Creating Kubernetes namespaces..."
# kubectl apply -f k8s/namespace.yaml
# kubectl apply -f k8s/do-registry.yaml

# # Deploy OpenTelemetry Demo App without collectors, Jaeger, and Grafana
# show_progress "Deploying OpenTelemetry Demo Application (without collectors, Jaeger, and Grafana)..."
# helm repo add open-telemetry https://open-telemetry.github.io/opentelemetry-helm-charts
# helm repo update
# helm install my-otel-demo open-telemetry/opentelemetry-demo \
#     --version 0.32.8 \
#     --values k8s/otel-demo-app/collecter-values.yaml \
#     --namespace otel-demo \
#     --create-namespace \
#     --set jaeger.enabled=false \
#     --set grafana.enabled=false

# # Deploy custom application components
# show_progress "Deploying Custom Application Components..."
# kubectl apply -f k8s/database/mongodb.yaml
# wait_for_resource "custom-otel-app" "pod" "app=mongodb"

# kubectl apply -f k8s/backend/deployment.yaml -n custom-otel-app
# kubectl apply -f k8s/frontend/deployment.yaml -n custom-otel-app
# kubectl apply -f k8s/load-generator/deployment.yaml -n custom-otel-app

# # Wait for deployments
# wait_for_resource "custom-otel-app" "pod" "app=backend"
# wait_for_resource "custom-otel-app" "pod" "app=frontend"
# wait_for_resource "custom-otel-app" "pod" "app=load-generator"

# # Set up port forwarding in the background
# show_progress "Setting up port forwarding..."
# kubectl port-forward svc/my-otel-demo-frontendproxy -n otel-demo 8080:8080 &
# kubectl port-forward svc/frontend -n custom-otel-app 3000:3000 &

# show_progress "Creating welcome message..."
# cat << 'EOF' > ~/.welcome_message
# 🎉 Welcome to the OpenTelemetry Training Environment! 🎉

# Your environment is ready with:
# - Kubernetes cluster (minikube)
# - OpenTelemetry Demo App (without collectors) at http://localhost:8080
# - Custom Demo Application at http://localhost:3000
# - MongoDB Database
# - Load Generator

# Next Steps in the Training:
# 1. Deploy the OpenTelemetry Collector
# 2. Configure RBAC
# 3. Configure OpenTelemetry instrumentation

# Useful commands:
# - kubectl get pods -n otel-demo     # View OpenTelemetry demo pods
# - kubectl get pods -n custom-otel-app # View custom app pods
# - kubectl logs -n custom-otel-app <pod> # View custom app logs
# - minikube dashboard               # Open Kubernetes dashboard

# Happy learning! 🚀
# EOF

# # Add welcome message to bashrc
# echo 'cat ~/.welcome_message' >> ~/.bashrc

# show_progress "Setup complete! 🎉"
# show_progress "OpenTelemetry Demo App is available at http://localhost:8080"
# show_progress "Custom Demo App is available at http://localhost:3000"
# show_progress "You can now proceed with adding OpenTelemetry components!"