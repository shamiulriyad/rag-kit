import type { Source } from '../services/api'
import SourceList from './SourceList'

export interface ChatMessage {
  role: 'user' | 'assistant'
  text: string
  sources?: Source[]
}

export default function Message({ message }: { message: ChatMessage }) {
  const isUser = message.role === 'user'

  return (
    <div className={`message message--${message.role}`}>
      <div className="message__role">{isUser ? 'You' : 'Answer'}</div>
      <div className="message__text">{message.text}</div>
      {message.sources && <SourceList sources={message.sources} />}
    </div>
  )
}
