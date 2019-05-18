var getResourceSpecs = function(url) {
	return new Promise((resolve, reject) => {
		if (!url.match(/^https?:\/\//i)) {
			reject("url must start with http:// or https://");
		}
		// TODO stream instead of accumulating a string
		let resourceSpecs = '';
		require(url.startsWith('https') ? 'https' : 'http').get(url, (res) => {
			var gunzip = require('zlib').createGunzip();
			res.pipe(gunzip);
			gunzip.on('data', (chunk) => {
				resourceSpecs += chunk.toString();
			}).on('end', () => {
				resolve(JSON.parse(resourceSpecs));
			}).on('error', (e) => reject(e));
		});
	});
};

getResourceSpecs(process.env.SPEC_URL).then(function(resourceSpecs) {
	exports.templateProcessor = async function(event, context) {
		let response = {
			requestId : event.requestId, 
			status : "success", 
			fragment : event.fragment
		};
		let errors = [];
		let newFragment = JSON.parse(JSON.stringify(event.fragment.Resources));
		for (const resourceKey in newFragment) {
			let resource = newFragment[resourceKey];
			let matchingResourceTypes = [];
			for (const typeKey in resourceSpecs.ResourceTypes) {
				if (typeKey.endsWith(resource.Type)) {
					matchingResourceTypes.push(typeKey);
				}
			}
			if (!matchingResourceTypes.length) continue;
			else if (1 < matchingResourceTypes.length) {
				errors.push("Multiple matching resource types found for Resource '" + resourceKey + "' of Type '" + resource.Type + "'.  Choose one of [" + matchingResourceTypes.join(',') + "].");
			}
			resource.Type = matchingResourceTypes[0];
		}
		if (errors.length) {
			response.status = "Processing errors found: " + errors.join(",");
		} else {
			response.fragment = newFragment;
		}
		return response;
	};
}).then(function() {
	console.log(exports.templateProcessor(sampleRequest));
});

// sample request
sampleRequest = {
    "region" : "us-east-1", 
    "accountId" : "$ACCOUNT_ID", 
    "fragment" : {
    	"Resources" : {
    		"S3Resource" : {
    			"Type" : "S3::Bucket"
    		}, 
    		"Ambiguous" : {
    			"Type" : "ApiKey"
    		}
    	}
    }, 
    "transformId" : "$TRANSFORM_ID", 
    "params" : {  }, 
    "requestId" : "$REQUEST_ID",
    "templateParameterValues" : {  } 
};
// sample response
sampleResponse = {
    "requestId" : "$REQUEST_ID", 
    "status" : "$STATUS", 
    "fragment" : {  } 
}