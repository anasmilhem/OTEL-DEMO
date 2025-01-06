#!/bin/bash
set -e

echo "🚀 Starting Azure Kubernetes Environment Setup..."

# Remove subscription setting as it's not needed in Cloud Shell
# read -p "Enter the Azure subscription ID: " SUBSCRIPTION_ID
read -p "Enter the resource group name: " RESOURCE_GROUP
read -p "Enter the AKS cluster name: " CLUSTER_NAME
read -p "Enter the location (e.g., eastus): " LOCATION

# Remove subscription setting command as it's not needed
# az account set --subscription $SUBSCRIPTION_ID

# Variables for namespaces
NAMESPACE_CUSTOM_OTEL_APP="custom-otel-app"
NAMESPACE_OTEL_DEMO="otel-demo"

# Create a resource group
echo "✨ Creating resource group..."
az group create --name $RESOURCE_GROUP --location $LOCATION

# Create an AKS cluster
echo "✨ Creating AKS cluster..."
az aks create --resource-group $RESOURCE_GROUP --name $CLUSTER_NAME --node-count 1 --enable-addons monitoring --generate-ssh-keys

# Get AKS credentials
echo "✨ Getting AKS credentials..."
az aks get-credentials --resource-group $RESOURCE_GROUP --name $CLUSTER_NAME

# Create namespaces
echo "✨ Creating Kubernetes namespaces..."
kubectl create namespace $NAMESPACE_CUSTOM_OTEL_APP --dry-run=client -o yaml | kubectl apply -f -
kubectl apply -f k8s/namespace.yaml

# Apply registry secret to the custom-otel-app namespace
kubectl apply -f k8s/do-registry.yaml -n $NAMESPACE_CUSTOM_OTEL_APP

# Deploy OpenTelemetry Demo App without collectors, Grafana, and Jaeger
echo "✨ Deploying OpenTelemetry Demo Application (without collectors, Grafana, and Jaeger)..."
helm repo add open-telemetry https://open-telemetry.github.io/opentelemetry-helm-charts
helm repo update
helm install my-otel-demo open-telemetry/opentelemetry-demo \
    --version 0.32.8 \
    --set opentelemetry-collector.enabled=false \
    --set grafana.enabled=false \
    --set jaeger.enabled=false \
    --values k8s/otel-demo-app/collecter-values.yaml \
    --namespace $NAMESPACE_OTEL_DEMO \
    --create-namespace

# Deploy custom application components
echo "✨ Deploying Custom Application Components..."

# Deploy MongoDB first and wait for it
echo "✨ Deploying MongoDB..."
kubectl apply -f k8s/database/mongodb.yaml -n $NAMESPACE_CUSTOM_OTEL_APP
kubectl rollout status statefulset/mongodb -n $NAMESPACE_CUSTOM_OTEL_APP --timeout=300s

# Verify MongoDB is ready before proceeding
until kubectl get pod mongodb-0 -n $NAMESPACE_CUSTOM_OTEL_APP -o jsonpath='{.status.phase}' | grep -q "Running"; do
    echo "Waiting for MongoDB pod to be running..."
    sleep 5
done

# Deploy other components without waiting
echo "✨ Deploying backend..."
kubectl apply -f k8s/backend/deployment.yaml -n $NAMESPACE_CUSTOM_OTEL_APP

echo "✨ Deploying frontend..."
kubectl apply -f k8s/frontend/deployment.yaml -n $NAMESPACE_CUSTOM_OTEL_APP

echo "✨ Deploying load generator..."
kubectl apply -f k8s/load-generator/deployment.yaml -n $NAMESPACE_CUSTOM_OTEL_APP

# Modify the welcome message to show external IP instead of localhost
echo "✨ Creating welcome message..."
cat << 'EOF' > ~/.welcome_message
🎉 Welcome to the OpenTelemetry Training Environment! 🎉
Your environment is ready with:
- Kubernetes cluster (AKS)
- OpenTelemetry Demo App
- Custom Demo Application
- MongoDB Database
- Load Generator

To access your applications:
1. Get the external IP for the OpenTelemetry Demo App:
   kubectl get svc my-otel-demo-frontendproxy -n otel-demo -o jsonpath='{.status.loadBalancer.ingress[0].ip}'

2. Get the external IP for the Custom Demo App:
   kubectl get svc frontend -n custom-otel-app -o jsonpath='{.status.loadBalancer.ingress[0].ip}'

Useful commands:
- kubectl get pods -n otel-demo     # View OpenTelemetry demo pods
- kubectl get pods -n custom-otel-app # View custom app pods
- kubectl logs -n custom-otel-app <pod> # View custom app logs
- az aks list                       # View AKS clusters
Happy learning! 🚀
EOF

# Add welcome message to bashrc
echo 'cat ~/.welcome_message' >> ~/.bashrc

echo "✨ Setup complete! 🎉"
echo "To get the OpenTelemetry Demo App URL, run:"
echo "kubectl get svc my-otel-demo-frontendproxy -n otel-demo -o jsonpath='{.status.loadBalancer.ingress[0].ip}'"
echo "To get the Custom Demo App URL, run:"
echo "kubectl get svc frontend -n custom-otel-app -o jsonpath='{.status.loadBalancer.ingress[0].ip}'"
echo "You can now proceed with adding OpenTelemetry components!" 