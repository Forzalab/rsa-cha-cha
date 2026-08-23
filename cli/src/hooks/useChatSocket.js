import { useCallback, useEffect, useRef, useState } from 'react'
import { errorText, joinMessage, parseFrame, sendMessage } from '../lib/protocol.js'
import { decryptText, DEV_KEYPAIR, encryptText } from '../lib/rsa.js'

const DEFAULT_URL = `ws://${window.location.hostname || 'localhost'}:6868`
export function useChatSocket(url = import.meta.env.VITE_WS_URL || DEFAULT_URL) {
  const socketRef = useRef(null)
  const pendingJoinRef = useRef(null)
  const [status, setStatus] = useState('connecting')
  const [username, setUsername] = useState('')
  const [members, setMembers] = useState([])
  const [error, setError] = useState('')
  const [messages, setMessages] = useState([])

  const applyReaction = useCallback((messageId, emoji, sender, action = 'ADD') => {
    setMessages((current) => current.map((message) => {
      if (message.id !== messageId) return message
      const reactedBy = message.reactions?.[emoji] ?? []
      if (action === 'REMOVE') {
        const remaining = reactedBy.filter((name) => name !== sender)
        const reactions = { ...message.reactions }
        if (remaining.length) reactions[emoji] = remaining
        else delete reactions[emoji]
        return { ...message, reactions }
      }
      if (reactedBy.includes(sender)) return message
      return {
        ...message,
        reactions: { ...message.reactions, [emoji]: [...reactedBy, sender] },
      }
    }))
  }, [])

  useEffect(() => {
    const socket = new WebSocket(url)
    socketRef.current = socket

    socket.addEventListener('open', () => {
      if (socketRef.current !== socket) return
      setError('')
      setStatus('connected')
    })
    socket.addEventListener('close', () => {
      if (socketRef.current !== socket) return
      setStatus('disconnected')
      pendingJoinRef.current?.reject(new Error('The server disconnected.'))
      pendingJoinRef.current = null
    })
    socket.addEventListener('error', () => {
      if (socketRef.current === socket) setError('Could not connect to the chat server.')
    })
    socket.addEventListener('message', ({ data }) => {
      if (socketRef.current !== socket) return
      try {
        const message = parseFrame(data)
        if (message.request === 'JOIN_SUCC') {
          setUsername(message.receiver)
          setStatus('joined')
          setError('')
          pendingJoinRef.current?.resolve()
          pendingJoinRef.current = null
        } else if (message.request === 'MEMBERS') {
          setMembers(Array.isArray(message.content?.users) ? message.content.users : [])
        } else if (message.request === 'DELIVER') {
          const plaintext = decryptText(message.content?.cipher ?? '')
          if (message.content?.kind === 'REACTION') {
            applyReaction(message.content.message_id, plaintext, message.sender, message.content.reaction_action)
          } else {
            setMessages((current) => [...current, {
              id: message.content?.message_id ?? crypto.randomUUID(),
              sender: message.sender,
              plaintext,
              cipher: message.content?.cipher ?? '',
              reactions: {},
            }])
          }
        } else if (message.request.startsWith('ERR_')) {
          const text = errorText(message.request)
          setError(text)
          pendingJoinRef.current?.reject(new Error(text))
          pendingJoinRef.current = null
        }
      } catch {
        setError('Received an unreadable response from the server.')
      }
    })

    return () => {
      if (socketRef.current === socket) socketRef.current = null
      socket.close()
    }
  }, [applyReaction, url])

  const join = useCallback((name) => {
    const socket = socketRef.current
    if (!socket || socket.readyState !== WebSocket.OPEN) {
      return Promise.reject(new Error('The server is not connected yet.'))
    }
    setError('')
    setStatus('joining')
    socket.send(JSON.stringify(joinMessage(name, DEV_KEYPAIR.publicKey)))
    return new Promise((resolve, reject) => {
      pendingJoinRef.current = { resolve, reject }
    })
  }, [])

  const send = useCallback((plaintext) => {
    const socket = socketRef.current
    if (!socket || socket.readyState !== WebSocket.OPEN || !username) return false

    const cipher = encryptText(plaintext)
    const messageId = crypto.randomUUID()
    const recipients = members.filter((member) => member !== username)
    for (const recipient of recipients) {
      socket.send(JSON.stringify(sendMessage(username, recipient, cipher, { message_id: messageId })))
    }
    setMessages((current) => [...current, {
      id: messageId, sender: username, plaintext, cipher, reactions: {},
    }])
    return true
  }, [members, username])

  const react = useCallback((messageId, emoji) => {
    const socket = socketRef.current
    if (!socket || socket.readyState !== WebSocket.OPEN || !username) return
    const cipher = encryptText(emoji)
    const message = messages.find((item) => item.id === messageId)
    const action = message?.reactions?.[emoji]?.includes(username) ? 'REMOVE' : 'ADD'
    for (const recipient of members.filter((member) => member !== username)) {
      socket.send(JSON.stringify(sendMessage(username, recipient, cipher, {
        kind: 'REACTION', message_id: messageId, reaction_action: action,
      })))
    }
    applyReaction(messageId, emoji, username, action)
  }, [applyReaction, members, messages, username])

  return { status, username, members, messages, error, join, send, react, clearError: () => setError('') }
}
