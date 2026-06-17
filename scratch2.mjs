async function run() {
  const url = 'https://vuttik.com/api/users/biz-1781492434385';
  console.log('Fetching', url);
  
  const res1 = await fetch(url);
  console.log('Normal:', await res1.json());
  
  const res2 = await fetch(url + '?raw=true');
  console.log('Raw:', await res2.json());
}
run();
