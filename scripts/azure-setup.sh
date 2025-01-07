#!/bin/bash
set -e

echo "🚀 Starting Azure Kubernetes Environment Setup..."

# List and select Azure subscription
echo "Available Azure subscriptions:"
az account list --query "[].{Name:name, ID:id}" -o table
echo ""
read -p "Enter the subscription ID you want to use: " SUBSCRIPTION_ID

# Set the subscription
echo "✨ Setting Azure subscription..."
az account set --subscription $SUBSCRIPTION_ID

# Verify subscription
CURRENT_SUB=$(az account show --query "id" -o tsv)
if [ "$CURRENT_SUB" != "$SUBSCRIPTION_ID" ]; then
    echo "Error: Failed to set subscription"
    exit 1
fi
echo "Using subscription: $(az account show --query "name" -o tsv)"

# Set GitHub raw content URL
GITHUB_RAW_URL="https://raw.githubusercontent.com/anasmilhem/OTEL-DEMO/main"

# Resource Group Selection
echo "Do you want to use an existing resource group or create a new one?"
select rg_choice in "Use existing" "Create new"; do
    case $rg_choice in
        "Use existing")
            # List available resource groups
            echo "Available resource groups:"
            az group list --query "[].name" -o tsv
            read -p "Enter the name of the existing resource group: " RESOURCE_GROUP
            # Verify resource group exists
            if ! az group show --name $RESOURCE_GROUP >/dev/null 2>&1; then
                echo "Error: Resource group '$RESOURCE_GROUP' not found"
                exit 1
            fi
            break
            ;;
        "Create new")
            read -p "Enter the name for the new resource group: " RESOURCE_GROUP
            read -p "Enter the location (e.g., eastus): " LOCATION
            echo "✨ Creating resource group..."
            az group create --name $RESOURCE_GROUP --location $LOCATION
            break
            ;;
        *) echo "Invalid option $REPLY";;
    esac
done

# AKS Cluster Selection
echo "Do you want to use an existing AKS cluster or create a new one?"
select aks_choice in "Use existing" "Create new"; do
    case $aks_choice in
        "Use existing")
            # List available AKS clusters in the resource group
            echo "Available AKS clusters in resource group $RESOURCE_GROUP:"
            az aks list --resource-group $RESOURCE_GROUP --query "[].name" -o tsv
            read -p "Enter the name of the existing AKS cluster: " CLUSTER_NAME
            # Verify cluster exists
            if ! az aks show --name $CLUSTER_NAME --resource-group $RESOURCE_GROUP >/dev/null 2>&1; then
                echo "Error: AKS cluster '$CLUSTER_NAME' not found"
                exit 1
            fi
            break
            ;;
        "Create new")
            read -p "Enter the name for the new AKS cluster: " CLUSTER_NAME
            echo "✨ Creating AKS cluster..."
            if [ "$rg_choice" = "Create new" ]; then
                az aks create --resource-group $RESOURCE_GROUP --name $CLUSTER_NAME --node-count 4 --enable-addons monitoring --generate-ssh-keys
            else
                LOCATION=$(az group show --name $RESOURCE_GROUP --query location -o tsv)
                az aks create --resource-group $RESOURCE_GROUP --name $CLUSTER_NAME --node-count 4 --enable-addons monitoring --generate-ssh-keys --location $LOCATION
            fi
            break
            ;;
        *) echo "Invalid option $REPLY";;
    esac
done

# Variables for namespaces
NAMESPACE_CUSTOM_OTEL_APP="custom-otel-app"
NAMESPACE_OTEL_DEMO="otel-demo"

# Get AKS credentials
echo "✨ Getting AKS credentials..."
az aks get-credentials --resource-group $RESOURCE_GROUP --name $CLUSTER_NAME

# Create namespaces
echo "✨ Creating Kubernetes namespaces..."
kubectl create namespace $NAMESPACE_CUSTOM_OTEL_APP --dry-run=client -o yaml | kubectl apply -f -
kubectl apply -f "$GITHUB_RAW_URL/k8s/namespace.yaml"

# Apply registry secret
kubectl apply -f "$GITHUB_RAW_URL/k8s/do-registry.yaml" -n $NAMESPACE_CUSTOM_OTEL_APP

# Deploy OpenTelemetry Demo App
echo "✨ Deploying OpenTelemetry Demo Application..."
helm repo add open-telemetry https://open-telemetry.github.io/opentelemetry-helm-charts
helm repo update
helm install my-otel-demo open-telemetry/opentelemetry-demo \
    --version 0.32.8 \
    --set opentelemetry-collector.enabled=false \
    --set grafana.enabled=false \
    --set jaeger.enabled=false \
    --values "$GITHUB_RAW_URL/k8s/otel-demo-app/collecter-values.yaml" \
    --namespace $NAMESPACE_OTEL_DEMO \
    --create-namespace

# Deploy MongoDB and other components
echo "✨ Deploying MongoDB..."
kubectl apply -f "$GITHUB_RAW_URL/k8s/database/mongodb.yaml" -n $NAMESPACE_CUSTOM_OTEL_APP
kubectl rollout status statefulset/mongodb -n $NAMESPACE_CUSTOM_OTEL_APP --timeout=300s

# Verify MongoDB is ready
until kubectl get pod mongodb-0 -n $NAMESPACE_CUSTOM_OTEL_APP -o jsonpath='{.status.phase}' | grep -q "Running"; do
    echo "Waiting for MongoDB pod to be running..."
    sleep 5
done

# Deploy other components
echo "✨ Deploying backend..."
kubectl apply -f "$GITHUB_RAW_URL/k8s/backend/deployment.yaml" -n $NAMESPACE_CUSTOM_OTEL_APP

echo "✨ Deploying frontend..."
kubectl apply -f "$GITHUB_RAW_URL/k8s/frontend/deployment.yaml" -n $NAMESPACE_CUSTOM_OTEL_APP

echo "✨ Deploying load generator..."
kubectl apply -f "$GITHUB_RAW_URL/k8s/load-generator/deployment.yaml" -n $NAMESPACE_CUSTOM_OTEL_APP

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