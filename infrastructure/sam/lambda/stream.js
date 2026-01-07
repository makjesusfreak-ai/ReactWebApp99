/**
 * DynamoDB Stream Handler
 * Processes DynamoDB stream events and broadcasts changes for real-time sync
 */

exports.handler = async (event) => {
  console.log('Stream Event:', JSON.stringify(event, null, 2));

  for (const record of event.Records) {
    const { eventName, dynamodb } = record;

    console.log(`Processing ${eventName} event`);

    // Get the new and old images
    const newImage = dynamodb?.NewImage
      ? unmarshall(dynamodb.NewImage)
      : null;
    const oldImage = dynamodb?.OldImage
      ? unmarshall(dynamodb.OldImage)
      : null;

    // Determine the type of change
    let changeType;
    switch (eventName) {
      case 'INSERT':
        changeType = 'CREATE';
        break;
      case 'MODIFY':
        changeType = 'UPDATE';
        break;
      case 'REMOVE':
        changeType = 'DELETE';
        break;
      default:
        console.log(`Unknown event type: ${eventName}`);
        continue;
    }

    // Log the change for monitoring
    console.log('Change detected:', {
      type: changeType,
      id: newImage?.id || oldImage?.id,
      ailmentName: newImage?.ailment?.name || oldImage?.ailment?.name,
    });

    // Here you could:
    // 1. Publish to SNS for real-time notifications
    // 2. Update AppSync subscriptions
    // 3. Sync to other systems
    // 4. Update analytics/metrics

    // Example: Broadcast to connected WebSocket clients via AppSync
    // await broadcastToAppSync(changeType, newImage || oldImage);
  }

  return {
    statusCode: 200,
    body: JSON.stringify({
      message: `Processed ${event.Records.length} records`,
    }),
  };
};

// Simple unmarshall function for DynamoDB records
function unmarshall(item) {
  const result = {};
  
  for (const [key, value] of Object.entries(item)) {
    result[key] = unmarshallValue(value);
  }
  
  return result;
}

function unmarshallValue(value) {
  if (value.S !== undefined) return value.S;
  if (value.N !== undefined) return Number(value.N);
  if (value.BOOL !== undefined) return value.BOOL;
  if (value.NULL !== undefined) return null;
  if (value.L !== undefined) return value.L.map(unmarshallValue);
  if (value.M !== undefined) return unmarshall(value.M);
  if (value.SS !== undefined) return new Set(value.SS);
  if (value.NS !== undefined) return new Set(value.NS.map(Number));
  if (value.BS !== undefined) return new Set(value.BS);
  
  return value;
}

// Placeholder for AppSync broadcast function
async function broadcastToAppSync(changeType, ailment) {
  // Implementation would depend on your AppSync configuration
  // This would typically use the AWS AppSync SDK to trigger subscriptions
  console.log('Would broadcast to AppSync:', { changeType, ailmentId: ailment?.id });
}
