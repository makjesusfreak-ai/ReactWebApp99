const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const {
  DynamoDBDocumentClient,
  GetCommand,
  PutCommand,
  DeleteCommand,
  ScanCommand,
  UpdateCommand,
} = require('@aws-sdk/lib-dynamodb');
const { v4: uuidv4 } = require('uuid');

const client = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(client);
const TABLE_NAME = process.env.DYNAMODB_TABLE || 'Ailment';

// Response helper
const response = (statusCode, body) => ({
  statusCode,
  headers: {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type,Authorization,X-Api-Key',
  },
  body: JSON.stringify(body),
});

// Main handler
exports.handler = async (event) => {
  console.log('Event:', JSON.stringify(event, null, 2));

  const { httpMethod, pathParameters, body } = event;
  const id = pathParameters?.id;

  try {
    switch (httpMethod) {
      case 'GET':
        if (id) {
          return await getAilment(id);
        }
        return await getAllAilments();

      case 'POST':
        return await createAilment(JSON.parse(body));

      case 'PUT':
        if (!id) {
          return response(400, { error: 'Missing ailment ID' });
        }
        return await updateAilment(id, JSON.parse(body));

      case 'DELETE':
        if (!id) {
          return response(400, { error: 'Missing ailment ID' });
        }
        return await deleteAilment(id);

      case 'OPTIONS':
        return response(200, {});

      default:
        return response(405, { error: 'Method not allowed' });
    }
  } catch (error) {
    console.error('Error:', error);
    return response(500, { error: error.message });
  }
};

// Get all ailments
async function getAllAilments() {
  const result = await docClient.send(
    new ScanCommand({
      TableName: TABLE_NAME,
    })
  );
  return response(200, result.Items || []);
}

// Get single ailment
async function getAilment(id) {
  const result = await docClient.send(
    new GetCommand({
      TableName: TABLE_NAME,
      Key: { id },
    })
  );

  if (!result.Item) {
    return response(404, { error: 'Ailment not found' });
  }

  return response(200, result.Item);
}

// Create ailment
async function createAilment(data) {
  const ailment = {
    id: data.id || uuidv4(),
    ailment: {
      name: data.ailment?.name || '',
      description: data.ailment?.description || '',
      duration: data.ailment?.duration || 0,
      intensity: data.ailment?.intensity || 0,
      severity: data.ailment?.severity || 0,
    },
    treatments: processTreatments(data.treatments || []),
    diagnostics: processDiagnostics(data.diagnostics || []),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  await docClient.send(
    new PutCommand({
      TableName: TABLE_NAME,
      Item: ailment,
    })
  );

  return response(201, ailment);
}

// Update ailment
async function updateAilment(id, data) {
  // First check if exists
  const existing = await docClient.send(
    new GetCommand({
      TableName: TABLE_NAME,
      Key: { id },
    })
  );

  if (!existing.Item) {
    return response(404, { error: 'Ailment not found' });
  }

  const updated = {
    ...existing.Item,
    ailment: data.ailment || existing.Item.ailment,
    treatments: data.treatments
      ? processTreatments(data.treatments)
      : existing.Item.treatments,
    diagnostics: data.diagnostics
      ? processDiagnostics(data.diagnostics)
      : existing.Item.diagnostics,
    updatedAt: new Date().toISOString(),
  };

  await docClient.send(
    new PutCommand({
      TableName: TABLE_NAME,
      Item: updated,
    })
  );

  return response(200, updated);
}

// Delete ailment
async function deleteAilment(id) {
  await docClient.send(
    new DeleteCommand({
      TableName: TABLE_NAME,
      Key: { id },
    })
  );

  return response(200, { success: true, message: 'Ailment deleted' });
}

// Helper functions
function processTreatments(treatments) {
  return treatments.map((t) => ({
    id: t.id || uuidv4(),
    name: t.name || '',
    description: t.description || '',
    application: t.application || 'oral',
    efficacy: t.efficacy || 0,
    duration: t.duration || 0,
    intensity: t.intensity || 0,
    type: t.type || 'symptom-based',
    sideEffects: processSideEffects(t.sideEffects || []),
    setting: t.setting || 'clinic',
    isPreventative: t.isPreventative || false,
    isPalliative: t.isPalliative || false,
    isCurative: t.isCurative || false,
  }));
}

function processDiagnostics(diagnostics) {
  return diagnostics.map((d) => ({
    id: d.id || uuidv4(),
    name: d.name || '',
    description: d.description || '',
    efficacy: d.efficacy || 0,
    duration: d.duration || 0,
    intensity: d.intensity || 0,
    type: d.type || 'symptom-based',
    sideEffects: processSideEffects(d.sideEffects || []),
    setting: d.setting || 'clinic',
  }));
}

function processSideEffects(sideEffects) {
  return sideEffects.map((s) => ({
    id: s.id || uuidv4(),
    name: s.name || '',
    description: s.description || '',
    duration: s.duration || 0,
    intensity: s.intensity || 0,
    severity: s.severity || 0,
  }));
}
