import React, { useState, useEffect } from 'react'
import { supabase } from './CreateUser'
import './ManageUsers.css'

function ManageUsers({ onLogout, onNavigate }) {
  const [users, setUsers] = useState([])
  const [name, setName] = useState({
    name: '', role: ''
  })
  const [name2, setName2] = useState({
    id: '', name: '', role: ''
  })

  useEffect(() => {
    getUsers()
  }, [])

  async function getUsers() {
    const { data } = await supabase
      .from('users')
      .select('*')
    setUsers(data)
  }

  function handleChange(e) {
    setName(prevFormData => {
      return {
        ...prevFormData,
        [e.target.name]: e.target.value
      }
    })
  }

  function handleChange2(e) {
    setName2(prevFormData => {
      return {
        ...prevFormData,
        [e.target.name]: e.target.value
      }
    })
  }

  async function addUser(e) {
    e.preventDefault()

    if (!name.name || !name.role) {
      alert('Please fill in both name and role')
      return
    }

    try {
      await supabase
        .from('users')
        .insert({ name: name.name, role: name.role })

      setName({ name: '', role: '' })
      await getUsers()
    } catch (error) {
      console.error('Error adding user:', error)
    }
  }

  async function deleteUser(id) {
    try {
      await supabase
        .from('users')
        .delete()
        .eq('id', id)
      await getUsers()
    } catch (error) {
      console.error('Error deleting user:', error)
    }
  }

  function showUser(id) {
    users.map((user) => {
      if (user.id == id) {
        setName2({
          id: user.id,
          name: user.name,
          role: user.role
        })
      }
    })
  }

  async function updateUser(e) {
    e.preventDefault()

    if (!name2.name || !name2.role) {
      alert('Please fill in both name and role')
      return
    }

    try {
      await supabase
        .from('users')
        .update({ name: name2.name, role: name2.role })
        .eq('id', name2.id)

      setName2({ id: '', name: '', role: '' })
      await getUsers()
    } catch (error) {
      console.error('Error updating user:', error)
    }
  }

  return (
    <div className="page-container">
      <div className="page-content">
        <h1>Manage Users</h1>
        
        <div className="user-forms">
          <div className="form-section">
            <h3>Create User</h3>
            <form onSubmit={addUser}>
              <input 
                type="text" 
                name='name' 
                placeholder="User Name"
                value={name.name}
                onChange={handleChange}
              />
              <input 
                type="text" 
                name='role' 
                placeholder="User Role"
                value={name.role}
                onChange={handleChange}
              />
              <button type='submit'>Create User</button>
            </form>
          </div>

          <div className="form-section">
            <h3>Update User</h3>
            <form onSubmit={updateUser}>
              <input 
                type="text" 
                placeholder='Name' 
                name='name' 
                onChange={handleChange2} 
                value={name2.name}
              />
              <input 
                type="text" 
                placeholder='Role' 
                name='role' 
                onChange={handleChange2} 
                value={name2.role}
              />
              <button type='submit'>Update</button>
            </form>
          </div>
        </div>

        <div className="users-table">
          <table>
            <thead>
              <tr>
                <th>ID</th>
                <th>NAME</th>
                <th>ROLE</th>
                <th>ACTIONS</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <tr key={user.id}>
                  <td>{user.id}</td>
                  <td>{user.name}</td>
                  <td>{user.role}</td>
                  <td>
                    <button onClick={() => showUser(user.id)} className="update-btn">Update</button>
                    <button onClick={() => deleteUser(user.id)} className="delete-btn">Delete</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

export default ManageUsers
