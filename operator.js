const WebSocket = require('ws')
const https = require('https');
const fs = require('fs');

// Read SSL certificate and private key files
const sslOptions = {
	cert: fs.readFileSync('/etc/ssl/chatter.today.fullchain.pem'),
	key: fs.readFileSync('/etc/ssl/private/chatter.today.key')
};

// Create an HTTPS server
const server = https.createServer(sslOptions);

// Create a WebSocket server
const wss = new WebSocket.Server({ server });



var number_to_clients = new Map();

var calling_list = [];

wss.on('connection', (ws) => {
	console.log('Client connected');
	let my_number = getRandomNumber();

	ws.send(JSON.stringify({type: 'number_assign', number: my_number}));
	
	number_to_clients.set(my_number,ws);


	ws.on('message', (message) => {
		console.log(`Received message: ${message}`);
		let parsed = JSON.parse(message);

		if(parsed.type == 'iceCandidate'){
			number_to_clients.get(parsed.number).send(JSON.stringify({type: 'iceCandidate', caller: my_number, data: parsed.data}));
		}


		if(parsed.type == 'CALL_OFFER'){
			let number = parsed.number;
			if(!number){
				return;
			}
			if(!number_to_clients.has(number)){
				ws.send(JSON.stringify({type: 'error', msg:"Sorry, that number is not known to me"}));
				return;
			}

			//number_to_clients.get(number).send(`INCOMING_CALL ${my_number}`);
			calling_list.push(`${my_number} to ${number}`);
			number_to_clients.get(number).send(JSON.stringify(parsed));
		}

		if(parsed.type=='CALL_ANSWER'){
			let number = parsed.number;
			if(!number || !(calling_list.includes(`${number} to ${my_number}`))){
				return;
			}

			number_to_clients.get(number).send(JSON.stringify(parsed));

		}
		
		if(parsed.type=='DENY'){
			let number = parsed.number;
			if(!number || calling_list.includes(`${number} to ${my_number}`)){
				return;
			}
			number_to_clients.get(number).send("The one you called hung up");
			
			calling_list.splice(calling_list.indexOf(`${number} to ${my_number}`),1);
		}

	});

	ws.on('close', () => {
		console.log('Client disconnected');
		number_to_clients.delete(my_number);
	});
});

function getRandomNumber() {
	const prefix = Math.floor(Math.random() * 9000) + 1000;
	const suffix = Math.floor(Math.random() * 900000) + 100000;
	return `${prefix}-${suffix}`;
}


// Start the HTTPS server
server.listen(8081, () => {
	console.log('Server started on port 8081');
});
