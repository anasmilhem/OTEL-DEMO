#!/bin/bash
set -e

echo "🚀 Starting Training Environment Setup..."

# Wait for Docker to be ready
max_retries=30
counter=0
while ! docker info >/dev/null 2>&1; do
    counter=$((counter + 1))
    if [ $counter -gt $max_retries ]; then
        echo "Error: Docker not ready after $max_retries attempts"
        exit 1
    fi
    echo "⏳ Waiting for Docker to be ready... ($counter/$max_retries)"
    sleep 2
done

# Function to wait for a specific kubernetes resource
wait_for_resource() {
    local namespace=$1
    local resource_type=$2
    local label=$3
    echo "⏳ Waiting for $resource_type in namespace $namespace..."
    kubectl wait --for=condition=ready $resource_type -l $label -n $namespace --timeout=300s
}

# Function to show setup progress
show_progress() {
    echo "✨ $1"
}

# Start minikube if not running
if ! minikube status >/dev/null 2>&1; then
    show_progress "Starting minikube cluster..."
    minikube start --driver=docker --memory=4096 --cpus=2 || {
        echo "Failed to start minikube, retrying..."
        minikube delete
        sleep 5
        minikube start --driver=docker --memory=4096 --cpus=2
    }
fi

# Wait for kubernetes to be ready
echo "Waiting for kubernetes to be ready..."
max_retries=30
counter=0
while ! kubectl get nodes &>/dev/null; do
    counter=$((counter + 1))
    if [ $counter -gt $max_retries ]; then
        echo "Error: Kubernetes not ready after $max_retries attempts"
        exit 1
    fi
    echo "Waiting for Kubernetes to be ready... ($counter/$max_retries)"
    sleep 2
done

# Create namespaces
show_progress "Creating Kubernetes namespaces..."
kubectl apply -f k8s/namespace.yaml || true
kubectl apply -f k8s/do-registry.yaml || true

# Deploy OpenTelemetry Demo App
show_progress "Deploying OpenTelemetry Demo Application..."
helm repo add open-telemetry https://open-telemetry.github.io/opentelemetry-helm-charts
helm repo update
helm install my-otel-demo open-telemetry/opentelemetry-demo \
    --version 0.32.8 \
    --values k8s/otel-demo-app/collecter-values.yaml \
    --namespace otel-demo \
    --create-namespace \
    --set jaeger.enabled=false \
    --set grafana.enabled=false || true

# Deploy custom application components
show_progress "Deploying Custom Application Components..."
kubectl apply -f k8s/database/mongodb.yaml || true
wait_for_resource "custom-otel-app" "pod" "app=mongodb"

kubectl apply -f k8s/backend/deployment.yaml -n custom-otel-app || true
kubectl apply -f k8s/frontend/deployment.yaml -n custom-otel-app || true
kubectl apply -f k8s/load-generator/deployment.yaml -n custom-otel-app || true

# Wait for deployments
wait_for_resource "custom-otel-app" "pod" "app=backend"
wait_for_resource "custom-otel-app" "pod" "app=frontend"
wait_for_resource "custom-otel-app" "pod" "app=load-generator"

# Set up port forwarding in the background
show_progress "Setting up port forwarding..."
kubectl port-forward svc/my-otel-demo-frontendproxy -n otel-demo 8080:8080 &
kubectl port-forward svc/frontend -n custom-otel-app 3000:3000 &

show_progress "Creating welcome message..."
cat << 'EOF' > ~/.welcome_message
🎉 Welcome to the OpenTelemetry Training Environment! 🎉

Your environment is ready with:
- Kubernetes cluster (minikube)
- OpenTelemetry Demo App (without collectors) at http://localhost:8080
- Custom Demo Application at http://localhost:3000
- MongoDB Database
- Load Generator

Next Steps in the Training:
1. Deploy the OpenTelemetry Collector
2. Configure RBAC
3. Configure OpenTelemetry instrumentation

Useful commands:
- kubectl get pods -n otel-demo     # View OpenTelemetry demo pods
- kubectl get pods -n custom-otel-app # View custom app pods
- kubectl logs -n custom-otel-app <pod> # View custom app logs
- minikube dashboard               # Open Kubernetes dashboard

Happy learning! 🚀
EOF

# Add welcome message to bashrc
echo 'cat ~/.welcome_message' >> ~/.bashrc

show_progress "Setup complete! 🎉"
show_progress "OpenTelemetry Demo App is available at http://localhost:8080"
show_progress "Custom Demo App is available at http://localhost:3000"
show_progress "You can now proceed with adding OpenTelemetry components!"