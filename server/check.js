fetch('http://localhost:3000/api/groups/1/members/2/role', {
  method: 'PUT',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ userId: 1, role: 'subadmin' })
}).then(async r => {
  console.log(r.status);
  console.log(await r.text());
}).catch(console.error);
