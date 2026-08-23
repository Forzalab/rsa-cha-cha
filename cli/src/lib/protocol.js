export const SERVER_ID = 'SERVER'

export function makeEnvelope(sender, receiver, request, content = {}) {
  return { sender, receiver, request, content }
}

export function joinMessage(username, publicKey) {
  return makeEnvelope(username, SERVER_ID, 'JOIN', {
    key_value: String(publicKey.value),
    key_mod: String(publicKey.modulus),
    key_type: 'pub',
  })
}

export function sendMessage(sender, receiver, cipher, metadata = {}) {
  return makeEnvelope(sender, receiver, 'SEND', { cipher, ...metadata })
}

export function parseFrame(frame) {
  const message = JSON.parse(frame)
  if (!message || typeof message !== 'object' || typeof message.request !== 'string') {
    throw new Error('The server sent an invalid message.')
  }
  return message
}

export function errorText(request) {
  const messages = {
    ERR_DUPL_JOIN: 'That username is already in the room.',
    ERR_NOT_JOINED: 'Join the room before sending messages.',
    ERR_NO_USER: 'That user is no longer connected.',
    ERR_BAD_JSON: 'The server could not read that message.',
    ERR_UNSPC: 'The server does not support that request.',
  }
  return messages[request] ?? 'Something went wrong.'
}
