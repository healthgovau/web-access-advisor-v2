#!/bin/bash

# Script to kill all processes using a specified port
# Usage: ./kill-port.sh <port_number>
# Example: ./kill-port.sh 3002
#
# To make executable: chmod +x kill-port.sh

if [ $# -eq 0 ]; then
    echo "❌ Usage: $0 <port_number>"
    echo "   Example: $0 3002"
    exit 1
fi

PORT=$1

echo "🔍 Finding processes using port $PORT..."

# Find PIDs using the port
PIDS=$(netstat -ano | findstr ":$PORT" | awk '{print $5}' | sort | uniq)

if [ -z "$PIDS" ]; then
    echo "✅ No processes found using port $PORT"
    exit 0
fi

echo "📋 Found PIDs using port $PORT:"
echo "$PIDS"
echo ""

# Kill each PID
for PID in $PIDS; do
    if [ "$PID" != "" ] && [ "$PID" != "0" ]; then
        echo "🔪 Killing process $PID..."
        taskkill //PID $PID //F
        
        if [ $? -eq 0 ]; then
            echo "✅ Successfully killed PID $PID"
        else
            echo "❌ Failed to kill PID $PID"
        fi
    fi
done

echo ""
echo "🔍 Verifying - checking if port $PORT is still in use..."
REMAINING=$(netstat -ano | findstr ":$PORT")

if [ -z "$REMAINING" ]; then
    echo "✅ Port $PORT is now free!"
else
    echo "⚠️  Some processes may still be using port $PORT:"
    echo "$REMAINING"
fi
