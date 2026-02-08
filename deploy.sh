#!/bin/bash

# Deployment script for Agile Task Board
# This script deploys Firestore rules, indexes, and hosting to Firebase

echo "🚀 Starting Firebase Deployment..."
echo ""

# Check if Firebase CLI is installed
if ! command -v firebase &> /dev/null
then
    echo "❌ Firebase CLI is not installed"
    echo "   Install it with: npm install -g firebase-tools"
    exit 1
fi

echo "✅ Firebase CLI found"
echo ""

# Check if logged in
echo "🔐 Checking Firebase authentication..."
firebase projects:list > /dev/null 2>&1
if [ $? -ne 0 ]; then
    echo "❌ Not logged in to Firebase"
    echo "   Run: firebase login"
    exit 1
fi

echo "✅ Authenticated"
echo ""

# Confirm project
echo "📋 Current project:"
firebase use
echo ""

read -p "Is this the correct project? (y/n) " -n 1 -r
echo ""
if [[ ! $REPLY =~ ^[Yy]$ ]]
then
    echo "❌ Deployment cancelled"
    echo "   Switch project with: firebase use <project-id>"
    exit 1
fi

# Deploy Firestore Rules
echo ""
echo "📜 Deploying Firestore Security Rules..."
firebase deploy --only firestore:rules
if [ $? -ne 0 ]; then
    echo "❌ Failed to deploy security rules"
    exit 1
fi
echo "✅ Security rules deployed"

# Deploy Firestore Indexes
echo ""
echo "📊 Deploying Firestore Indexes..."
firebase deploy --only firestore:indexes
if [ $? -ne 0 ]; then
    echo "❌ Failed to deploy indexes"
    exit 1
fi
echo "✅ Indexes deployed (may take 5-10 minutes to build)"

# Deploy Hosting (optional)
echo ""
read -p "Deploy hosting? (y/n) " -n 1 -r
echo ""
if [[ $REPLY =~ ^[Yy]$ ]]
then
    echo "🌐 Deploying Hosting..."
    firebase deploy --only hosting
    if [ $? -ne 0 ]; then
        echo "❌ Failed to deploy hosting"
        exit 1
    fi
    echo "✅ Hosting deployed"
fi

echo ""
echo "🎉 Deployment complete!"
echo ""
echo "📱 Next steps:"
echo "   1. Check Firebase Console: https://console.firebase.google.com/project/agile-task-board"
echo "   2. Verify security rules are active"
echo "   3. Wait for indexes to finish building (5-10 minutes)"
echo "   4. Test the application"
echo ""
