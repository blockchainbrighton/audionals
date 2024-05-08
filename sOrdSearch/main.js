const baseApiUrl = 'https://api.sordinals.com/api/v1';

async function fetchData(url, sectionId, title) {
    console.log(`Fetching data from URL: ${url}`);
    try {
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`HTTP error! Status: ${response.status}`);
        }
        const data = await response.json();
        console.log(`Data received for ${title}:`, data);
        displayInscriptionData(sectionId, title, data);
        if (sectionId === 'inscriptionDetails' && data.inscriptionHash) {
            console.log(`Found inscriptionHash for fetching children: ${data.inscriptionHash}`);
            await fetchAndDisplayChildren(data.inscriptionHash);
        }
    } catch (error) {
        console.error(`Fetch error for ${title} with URL ${url}:`, error);
        displayInscriptionData(sectionId, title, { error: error.message });
    }
}


function adjustIframeSize(iframe) {
    iframe.style.height = `${iframe.clientWidth}px`;
}

async function displayInscriptionData(sectionId, title, data, isParent = true) {
    console.log(`Displaying data for ${title}`);
    const section = document.getElementById(sectionId);
    if (data) {
        let jsonData = JSON.stringify(data, null, 2);
        jsonData = jsonData.replace(/"id": "(.*?)"/, `"id": "<span style="color:orange;">$1</span>"`);
        jsonData = jsonData.replace(/"inscriptionHash": "(.*?)"/, `"inscriptionHash": "<span style="color:green;">$1</span>"`);
        jsonData = jsonData.replace(/"owner": "(.*?)"/, `"owner": "<span style="color:red;">$1</span>"`);
        jsonData = jsonData.replace(/"creationTime": "(.*?)"/, `"creationTime": "<span style="color:purple;">$1</span>"`);
        jsonData = jsonData.replace(/"fileUrl": "(.*?)"/, `"fileUrl": "<span style="color:orange;">$1</span>"`);
        section.innerHTML = `<h2>${title}</h2><pre>${jsonData}</pre>`;
    } else {
        section.innerHTML = `<h2>${title}</h2><p>No data available</p>`;
    }

    if (isParent && data && data.fileUrl) {
        const iframe = document.getElementById('inscriptionContentIframe');
        iframe.style.display = 'block';
        const contentToLoad = data.contentType && data.contentType.startsWith('image/') ?
            createImageContent(data.fileUrl) : data.fileUrl;
        loadIframeContent(iframe, contentToLoad);
    } else {
        document.getElementById('inscriptionContentIframe').style.display = 'none';
    }
}


function createImageContent(fileUrl) {
    const imageHTML = `<html><head><style>body,html{margin:0;padding:0;width:100%;height:100%;display:flex;justify-content:center;align-items:center;background-color:#f0f0f0;}img{width:100%;height:100%;max-width:100%;max-height:100%;object-fit:contain;}</style></head><body><img src="${fileUrl}" alt="Inscription Image"></body></html>`;
    const blob = new Blob([imageHTML], { type: 'text/html' });
    return URL.createObjectURL(blob);
}

function loadIframeContent(iframe, content) {
    iframe.src = content;
    iframe.onload = iframe.onerror = () => {
        if (content !== iframe.src) URL.revokeObjectURL(content);
        adjustIframeSize(iframe);
    };
}

async function fetchAndDisplayChildren(parentInscriptionHash) {
    const limit = 100;  // Increase or adjust based on your needs
    // Assume sort by 'id' or 'creationTime' if supported
    const url = `${baseApiUrl}/inscriptions/parent/${parentInscriptionHash}?order=desc&sort=id&page=1&limit=${limit}`;
    console.log(`Fetching up to ${limit} most recent children details for parent inscription hash: ${parentInscriptionHash}`);

    try {
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`HTTP error! Status: ${response.status}`);
        }
        const childData = await response.json();
        console.log(`Fetched children details:`, childData);

        const childCount = document.getElementById('childCount');
        childCount.innerHTML = `<span style="color:yellow;">Total Number of Children: ${childData.count}</span>`;
        const childDetails = document.getElementById('childDetails');
        childDetails.innerHTML = childData.data.length ? childData.data.map(child => 
            `<div>
                ID: <span style="color:blue;">${child.id}</span>, 
                Hash: <span style="color:green;">${child.inscriptionHash}</span>, 
                Owner: <span style="color:red;">${child.owner}</span>
            </div>`).join('') : 'No children found.';
    } catch (error) {
        console.error('Error fetching child inscriptions:', error);
        document.getElementById('childCount').innerHTML = '<span style="color:red;">Error fetching children count.</span>';
        document.getElementById('childDetails').innerHTML = `Error: ${error.message}`;
    }
}





async function getDetails(type, inputValue = null) {
    console.log(`Getting details for type: ${type}, inputValue: ${inputValue}`);
    const inputMap = {
        number: 'inscriptionNumberInput',
        hash: 'inscriptionHashInput',
        owner: 'ownerAddressInput',
        parent: 'parentIDInput',
    };
    const apiUrlPartMap = {
        number: 'inscriptions',
        hash: 'inscriptions/hash',
        owner: 'inscriptions/owner',
        parent: 'inscriptions/parent',
    };
    const sectionIdMap = {
        owner: 'ownedInscriptions',
        default: 'inscriptionDetails',
    };
    const titleMap = {
        number: 'Inscription Details',
        hash: 'Inscription Details by Hash',
        owner: 'Owned Inscriptions',
        parent: 'Child Inscriptions of Parent ID',
    };

    inputValue = inputValue || document.getElementById(inputMap[type]).value;
    const sectionId = sectionIdMap[type] || sectionIdMap.default;
    const title = titleMap[type];
    const url = `${baseApiUrl}/${apiUrlPartMap[type]}/${inputValue}`;
    if (inputValue) {
        if (type === 'parent') {
            fetchAndDisplayChildren(inputValue);
        } else {
            fetchData(url, sectionId, title);
        }
    }
}

function handleKeypress(e, type) {
    if (e.key === 'Enter') {
        e.preventDefault();
        getDetails(type);
    }
}
