#!/bin/bash
echo "Rolling back to pre-legitscript-stable..."
git checkout main
git reset --hard pre-legitscript-stable
git push origin main --force
echo "Rollback complete. Redeploy Firebase Hosting:"
echo "  firebase deploy --only hosting --site patriotictelehealth"
