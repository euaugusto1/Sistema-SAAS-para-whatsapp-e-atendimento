const http = require('http');

// Teste 1: Verificar se a API está rodando
console.log('🔍 Teste 1: Verificando se a API está rodando...\n');

http.get('http://localhost:3001', (res) => {
  console.log('✅ API está respondendo!');
  console.log(`   Status: ${res.statusCode}\n`);
  
  // Teste 2: Verificar endpoint de registro
  console.log('🔍 Teste 2: Testando endpoint de registro...\n');
  
  const registerData = JSON.stringify({
    email: `test${Date.now()}@example.com`,
    password: 'Test@123456',
    name: 'Test User'
  });
  
  const registerOptions = {
    hostname: 'localhost',
    port: 3001,
    path: '/auth/register',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': registerData.length
    }
  };
  
  const registerReq = http.request(registerOptions, (registerRes) => {
    let data = '';
    
    registerRes.on('data', (chunk) => {
      data += chunk;
    });
    
    registerRes.on('end', () => {
      if (registerRes.statusCode === 201) {
        console.log('✅ Registro bem-sucedido!');
        const response = JSON.parse(data);
        console.log(`   User ID: ${response.user.id}`);
        console.log(`   Email: ${response.user.email}`);
        if (response.user.memberships && response.user.memberships.length > 0) {
          console.log(`   Organization: ${response.user.memberships[0].organization.name}`);
        }
        console.log(`   Access Token: ${response.accessToken.substring(0, 20)}...`);
        
        // Teste 3: Verificar endpoint do WhatsApp
        console.log('\n🔍 Teste 3: Testando endpoint do WhatsApp...\n');
        
        const organizationId = response.user.memberships[0].organization.id;
        
        const whatsappOptions = {
          hostname: 'localhost',
          port: 3001,
          path: `/whatsapp/instances?organizationId=${organizationId}`,
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${response.accessToken}`
          }
        };
        
        const whatsappReq = http.request(whatsappOptions, (whatsappRes) => {
          let whatsappData = '';
          
          whatsappRes.on('data', (chunk) => {
            whatsappData += chunk;
          });
          
          whatsappRes.on('end', () => {
            if (whatsappRes.statusCode === 200) {
              console.log('✅ Endpoint do WhatsApp está funcionando!');
              const instances = JSON.parse(whatsappData);
              console.log(`   Total de instâncias: ${instances.length}`);
              
              // Teste 4: Criar uma instância WhatsApp
              console.log('\n🔍 Teste 4: Criando instância do WhatsApp...\n');
              
              const createInstanceData = JSON.stringify({
                name: `Test Instance ${Date.now()}`,
                phoneNumber: '+5511999999999',
                organizationId: organizationId
              });
              
              const createInstanceOptions = {
                hostname: 'localhost',
                port: 3001,
                path: '/whatsapp/instances',
                method: 'POST',
                headers: {
                  'Authorization': `Bearer ${response.accessToken}`,
                  'Content-Type': 'application/json',
                  'Content-Length': createInstanceData.length
                }
              };
              
              const createInstanceReq = http.request(createInstanceOptions, (createRes) => {
                let createData = '';
                
                createRes.on('data', (chunk) => {
                  createData += chunk;
                });
                
                createRes.on('end', () => {
                  if (createRes.statusCode === 201) {
                    console.log('✅ Instância WhatsApp criada com sucesso!');
                    const instance = JSON.parse(createData);
                    console.log(`   Instance ID: ${instance.id}`);
                    console.log(`   Name: ${instance.name}`);
                    console.log(`   Status: ${instance.status}`);
                    console.log(`   Phone: ${instance.phoneNumber}`);
                    
                    console.log('\n🎉 Todos os testes passaram com sucesso!');
                    console.log('\n📋 Resumo:');
                    console.log('   ✅ API rodando');
                    console.log('   ✅ Autenticação funcionando');
                    console.log('   ✅ WhatsApp module funcionando');
                    console.log('   ✅ Evolution API integrada');
                    console.log('\n💡 Próximo passo: Acesse http://localhost:3000 e faça login!');
                  } else {
                    console.log(`❌ Erro ao criar instância: ${createRes.statusCode}`);
                    console.log(createData);
                  }
                });
              });
              
              createInstanceReq.on('error', (error) => {
                console.error('❌ Erro na requisição:', error.message);
              });
              
              createInstanceReq.write(createInstanceData);
              createInstanceReq.end();
            } else {
              console.log(`❌ Erro no endpoint WhatsApp: ${whatsappRes.statusCode}`);
              console.log(whatsappData);
            }
          });
        });
        
        whatsappReq.on('error', (error) => {
          console.error('❌ Erro na requisição:', error.message);
        });
        
        whatsappReq.end();
      } else {
        console.log(`❌ Erro no registro: ${registerRes.statusCode}`);
        console.log(data);
      }
    });
  });
  
  registerReq.on('error', (error) => {
    console.error('❌ Erro na requisição:', error.message);
  });
  
  registerReq.write(registerData);
  registerReq.end();
  
}).on('error', (error) => {
  console.error('❌ API não está respondendo:', error.message);
  console.log('   Certifique-se de que o servidor está rodando na porta 3001');
});
