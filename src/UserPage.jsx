import React, {useState, useEffect} from 'react';
import { supabase } from './CreateUser';

const UserPage = ({ onLogout }) => {

    const [users, setUsers] = useState([]);

    const [name,setName] = useState({
        name: '', role: ''
    })

    const [name2,setName2] = useState({
        id: '',name: '', role: ''
    })

    console.log(users)


    useEffect(() => {
        getUsers()
    }, [])

    async function getUsers() {
        const {data} = await supabase
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
        }
        )
    }

        function handleChange2(e) {
        setName2(prevFormData => {
            return {
                ...prevFormData, 
                 [e.target.name]: e.target.value
            }
        }
        )
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
            .insert({name: name.name, role: name.role })
            
            setName({name: '', role: ''})
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

    function showUser(id)
    {   
        users.map((user) => {
            if(user.id == id){
                setName2({
                    id: user.id,
                    name: user.name,
                    role: user.role
                })
            }
        })
    }

    async function updateUser(e){
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
            
            setName2({id: '', name: '', role: ''})
            await getUsers()
        } catch (error) {
            console.error('Error updating user:', error)
        }
    }

    return (
        <div>
            <button onClick={onLogout} style={{padding: '10px 20px', margin: '10px', backgroundColor: '#d32f2f', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer', fontSize: '1rem'}}>Logout</button>

            <form onSubmit={addUser}>
                <input type="text" name = 'name' onChange = {handleChange}/>
                <input type="text" name = 'role' onChange = {handleChange}/>
                <button type='submit'>Create User</button>
            </form>

            <form onSubmit={updateUser}>
                <input type="text" placeholder='Name' name = 'name' onChange = {handleChange2} value={name2.name}/>
                <input type="text" placeholder='Role' name = 'role' onChange = {handleChange2} value={name2.role}/>
                <button type='submit'>Update</button>
            </form>


            <table>
                <thead>
                    <tr>
                        <th>ID</th>
                        <th>NAME</th>
                        <th>ROLE</th>
                        <th>DELETE</th>
                    </tr>
                </thead>


                <tbody>
                    {users.map((user) => (
                        <tr>
                            <td>{user.id}</td>
                            <td>{user.name}</td>
                            <td>{user.role}</td>
                            <td><button onClick={() => deleteUser(user.id)}>Delete</button></td>
                            <td><button onClick={() => showUser(user.id)}>Update</button></td>
                        </tr>
                    ))}
                </tbody>       
            </table>
        </div>
    )
}

export default UserPage;