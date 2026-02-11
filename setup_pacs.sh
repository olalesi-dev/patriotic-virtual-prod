#!/bin/bash
# Patriotic Telehealth - PACS Deployment Script (setup_pacs.sh)
# Deploys Orthanc + OHIF + Postgres on a GCE VM

PROJECT_ID="patriotic-virtual-prod"
ZONE="us-central1-a"
VM_NAME="orthanc-pacs"
IP_NAME="orthanc-ip"

echo "Starting PACS Deployment for $PROJECT_ID..."

# 1. Enable Compute Engine API
echo "Enabling Compute Engine API..."
gcloud services enable compute.googleapis.com --project=$PROJECT_ID

# 2. Reserve Static IP
echo "Reserving static IP '$IP_NAME'..."
gcloud compute addresses create $IP_NAME \
  --project=$PROJECT_ID \
  --region=us-central1 || echo "IP may already exist, proceeding..."

# 3. Create Firewall Rules (DICOM, Web, HTTPS)
echo "Creating firewall rules..."
gcloud compute firewall-rules create allow-dicom \
  --project=$PROJECT_ID \
  --allow tcp:4242,tcp:8042,tcp:443,tcp:80\
  --target-tags=orthanc-server \
  --source-ranges=0.0.0.0/0 \
  --description="DICOM C-STORE + Orthanc web UI" || echo "Firewall rule may already exist..."

# 4. Create GCE Instance
echo "Provisioning VM '$VM_NAME'..."
gcloud compute instances create $VM_NAME \
  --project=$PROJECT_ID \
  --zone=$ZONE \
  --machine-type=e2-standard-2 \
  --boot-disk-size=50GB \
  --image-family=ubuntu-2204-lts \
  --image-project=ubuntu-os-cloud \
  --tags=orthanc-server \
  --scopes=storage-full \
  --address=$IP_NAME \
  --metadata=startup-script='#! /bin/bash
    # Install Docker & Docker Compose
    apt-get update
    apt-get install -y ca-certificates curl gnupg lsb-release
    mkdir -p /etc/apt/keyrings
    curl -fsSL https://download.docker.com/linux/ubuntu/gpg | gpg --dearmor -o /etc/apt/keyrings/docker.gpg
    echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable" | tee /etc/apt/sources.list.d/docker.list > /dev/null
    apt-get update
    apt-get install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin

    # Create directory structure
    mkdir -p /opt/pacs
    cd /opt/pacs

    # (Note: Actual config files will be SCPed over separately)
    echo "VM Provisioned. Ready for config files." > /var/log/pacs-setup.log
  '

echo "VM Creation initiated. Waiting 30s for IP allocation..."
sleep 30

EXTERNAL_IP=$(gcloud compute instances describe $VM_NAME --project=$PROJECT_ID --zone=$ZONE --format='get(networkInterfaces[0].accessConfigs[0].natIP)')
echo "PACS VM deployed at: $EXTERNAL_IP"
echo ""
echo "NEXT STEPS:"
echo "1. Run 'gcloud compute scp docker-compose.yml orthanc.json ohif-config.js $VM_NAME:/opt/pacs/ --zone=$ZONE'"
echo "2. SSH into the VM: 'gcloud compute ssh $VM_NAME --zone=$ZONE'"
echo "3. Run 'cd /opt/pacs && docker compose up -d'"
