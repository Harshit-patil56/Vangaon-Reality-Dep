// lib/auth.js - Authentication utilities
import Cookies from 'js-cookie'
import axios from 'axios'

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'

export const login = async (username, password) => {
  try {
    const response = await axios.post(`${API_BASE_URL}/api/login`, {
      username,
      password
    })
    
    if (response.data.token) {
      Cookies.set('token', response.data.token, { expires: 1 })
      Cookies.set('user', JSON.stringify(response.data.user), { expires: 1 })
      return response.data
    }
  } catch (error) {
    throw error.response.data
  }
}

export const logout = () => {
  Cookies.remove('token')
  Cookies.remove('user')
}

export const getUser = () => {
  const user = Cookies.get('user')
  return user ? JSON.parse(user) : null
}

export const getToken = () => {
  return Cookies.get('token')
}

export const isAuthenticated = () => {
  return !!getToken()
}