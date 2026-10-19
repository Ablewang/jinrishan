import type { NavigateFunction } from 'react-router-dom'

export function goBack(navigate: NavigateFunction) {
  if (window.history.length > 1) {
    navigate(-1)
  } else {
    navigate('/')
  }
}
