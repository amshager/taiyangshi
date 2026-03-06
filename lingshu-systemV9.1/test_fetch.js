import http from 'http';
http.get('http://localhost:3000/ephe/seas_18.se1', (res) => {
  console.log('Status Code:', res.statusCode);
  console.log('Headers:', res.headers);
}).on('error', (e) => {
  console.error(e);
});
