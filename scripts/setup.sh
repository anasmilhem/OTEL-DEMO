#!/bin/bash
set -e
echo "🚀 Starting Training Environment Setup..."
# Function to wait for a specific kubernetes resource
wait_for_resource() {
    local namespace=$1
    local resource_type=$2
    local label=$3
    local name=$4
    echo "⏳ Waiting for $resource_type $name in namespace $namespace..."
    kubectl wait --for=condition=ready "$resource_type/$name" -n "$namespace" --timeout=300s || {
        echo "❌ Error waiting for $resource_type $name"
        kubectl describe "$resource_type/$name" -n "$namespace"
        kubectl get pods -n "$namespace"
        return 1
    }
}
# Function to show setup progress
show_progress() {
    echo "✨ $1"
}
# Function to wait for StatefulSet
wait_for_statefulset() {
    local namespace=$1
    local name=$2
    echo "⏳ Waiting for StatefulSet $name in namespace $namespace..."
    kubectl rollout status statefulset/$name -n $namespace --timeout=300s || {
        echo "❌ Timeout waiting for StatefulSet $name"
        kubectl describe statefulset $name -n $namespace
        kubectl get pods -n $namespace
        return 1
    }
}
# Start kind cluster if not running
if ! kind get clusters | grep -q "kind"; then
    show_progress "Starting kind cluster..."
    kind create cluster
fi
# Create namespaces
show_progress "Creating Kubernetes namespaces..."
kubectl create namespace custom-otel-app --dry-run=client -o yaml | kubectl apply -f -
kubectl apply -f k8s/namespace.yaml
# Apply registry secret to the custom-otel-app namespace
kubectl apply -f k8s/do-registry.yaml -n custom-otel-app
# Deploy OpenTelemetry Demo App without collectors, Grafana, and Jaeger
show_progress "Deploying OpenTelemetry Demo Application (without collectors, Grafana, and Jaeger)..."
helm repo add open-telemetry https://open-telemetry.github.io/opentelemetry-helm-charts
helm repo update
helm install my-otel-demo open-telemetry/opentelemetry-demo \
    --version 0.32.8 \
    --set opentelemetry-collector.enabled=false \
    --set grafana.enabled=false \
    --set jaeger.enabled=false \
    --values k8s/otel-demo-app/collecter-values.yaml \
    --namespace otel-demo \
    --create-namespace
# Deploy custom application components
show_progress "Deploying Custom Application Components..."

# Deploy MongoDB first and wait for it
show_progress "Deploying MongoDB..."
kubectl apply -f k8s/database/mongodb.yaml -n custom-otel-app
wait_for_statefulset "custom-otel-app" "mongodb"

# Verify MongoDB is ready before proceeding
until kubectl get pod mongodb-0 -n custom-otel-app -o jsonpath='{.status.phase}' | grep -q "Running"; do
    echo "Waiting for MongoDB pod to be running..."
    sleep 5
done

# Deploy other components without waiting
show_progress "Deploying backend..."
kubectl apply -f k8s/backend/deployment.yaml -n custom-otel-app

show_progress "Deploying frontend..."
kubectl apply -f k8s/frontend/deployment.yaml -n custom-otel-app

show_progress "Deploying load generator..."
kubectl apply -f k8s/load-generator/deployment.yaml -n custom-otel-app

# Set up port forwarding in the background
show_progress "Setting up port forwarding..."
kubectl port-forward svc/my-otel-demo-frontendproxy -n otel-demo 8080:8080 &
kubectl port-forward svc/frontend -n custom-otel-app 3000:3000 &
show_progress "Creating welcome message..."
cat << 'EOF' > ~/.welcome_message
🎉 Welcome to the OpenTelemetry Training Environment! 🎉
Your environment is ready with:
- Kubernetes cluster (kind)
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
- kind get clusters               # View kind clusters
Happy learning! 🚀
EOF
# Add welcome message to bashrc
echo 'cat ~/.welcome_message' >> ~/.bashrc
show_progress "Setup complete! 🎉"
show_progress "OpenTelemetry Demo App is available at http://localhost:8080"
show_progress "Custom Demo App is available at http://localhost:3000"
show_progress "You can now proceed with adding OpenTelemetry components!"