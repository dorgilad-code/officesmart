const MASTER_KEY = '$2a$10$HW.QVbOQ4z990.l/tM2d/OVSj3TFfSD4c9KuKw/WTz/n17oPpXHxm';
const ACCESS_KEY = '$2a$10$yveYqSOLL7beahc0U5tB5.2TBJuWPLbOIEJq6kb8dqJ4y4DuZ1x82';

exports.handler = async function(event) {
  const { binId, method, body } = JSON.parse(event.body || '{}');

  if (!binId) {
    return { statusCode: 400, body: JSON.stringify({ error: 'Missing binId' }) };
  }

  const isGet = (method || 'GET') === 'GET';
  const url = `https://api.jsonbin.io/v3/b/${binId}${isGet ? '/latest' : ''}`;

  const response = await fetch(url, {
    method: isGet ? 'GET' : 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'X-Master-Key': MASTER_KEY,
      'X-Access-Key': ACCESS_KEY,
    },
    body: !isGet ? JSON.stringify(body) : undefined,
  });

  const data = await response.json();

  return {
    statusCode: response.status,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
    },
    body: JSON.stringify(data),
  };
};
