## Getting Started

### Azure Deployment
1. Download the Azure setup script:
```bash
curl -O https://raw.githubusercontent.com/anasmilhem/OTEL-DEMO/main/scripts/azure-setup.sh
```
2. Run the script:
```bash
chmod +x azure-setup.sh
./azure-setup.sh
```

The environment will automatically:
- Set up a Kubernetes cluster
- Create necessary namespaces
- Deploy the otel demo application and custom otel example app
- Configure development tools


## Training Steps

During the training, you'll learn how to:
1. Deploy the OpenTelemetry Operator
   - Configure the collector deployment
   - Configure the collector DaemonSet
2. Configure RBAC for OpenTelemetry
   - Create service accounts
   - Set up roles and role bindings
3. Add OpenTelemetry autoinstrumentation using the dynatrace operator
   





 ## Dynatrace Dashboards

- Dynatrace otel dashboard displaying everything we did
![image](https://github.com/user-attachments/assets/7f278e97-1f4c-44e8-b3a3-4527124ccbbf)
- Dashboard by isItObservable Henrik Rexed
![image](https://github.com/user-attachments/assets/99c853b4-d3d5-47fa-9618-bbfcafca0e4d)


    

