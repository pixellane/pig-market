import axios from 'axios';

async function main(){
  try{
    const login = await axios.post('http://localhost:5000/api/auth/login', { email: 'admin@pigmarket.local', password: 'password123' });
    const token = login.data.token;
    console.log('token:', token ? 'RECEIVED' : 'NONE');
    const resp = await axios.post('http://localhost:5000/api/products/regenerate-descriptions', {}, { headers: { Authorization: `Bearer ${token}` } });
    console.log('updatedCount:', resp.data.updatedCount);
  }catch(err){
    console.error('Error:', err.response ? err.response.data : err.message);
    process.exit(1);
  }
}

main();
