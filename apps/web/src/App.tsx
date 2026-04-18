import { useEffect, useState } from 'react'
import './App.css'

type Todo = { id: number; title: string; done: number; created_at: string }

const API = (import.meta.env.VITE_API_BASE as string | undefined) ?? ''

export default function App() {
  const [todos, setTodos] = useState<Todo[]>([])
  const [input, setInput] = useState('')

  useEffect(() => {
    fetch(`${API}/api/todos`).then(r => r.json()).then(setTodos)
  }, [])

  async function addTodo() {
    if (!input.trim()) return
    const res = await fetch(`${API}/api/todos`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: input.trim() }),
    })
    const todo = await res.json() as Todo
    setTodos(prev => [todo, ...prev])
    setInput('')
  }

  async function toggleTodo(todo: Todo) {
    const res = await fetch(`${API}/api/todos/${todo.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ done: !todo.done }),
    })
    const updated = await res.json() as Todo
    setTodos(prev => prev.map(t => t.id === updated.id ? updated : t))
  }

  async function deleteTodo(id: number) {
    await fetch(`${API}/api/todos/${id}`, { method: 'DELETE' })
    setTodos(prev => prev.filter(t => t.id !== id))
  }

  return (
    <div className="app">
      <h1>今日山</h1>
      <div className="input-row">
        <input
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && addTodo()}
          placeholder="添加待办..."
        />
        <button onClick={addTodo}>添加</button>
      </div>
      <ul>
        {todos.map(todo => (
          <li key={todo.id} className={todo.done ? 'done' : ''}>
            <span onClick={() => toggleTodo(todo)}>{todo.title}</span>
            <button onClick={() => deleteTodo(todo.id)}>×</button>
          </li>
        ))}
      </ul>
    </div>
  )
}
