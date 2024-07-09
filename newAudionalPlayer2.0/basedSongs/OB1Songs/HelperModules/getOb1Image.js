export async function fetchImage(ordinalIdOrUrl, callback) {
    const url = ordinalIdOrUrl.startsWith('http') ? ordinalIdOrUrl : `https://ordinals.com/content/${ordinalIdOrUrl}`;

    try {
        const response = await fetch(url);
        const htmlContent = await response.text();
        const base64Image = extractBase64Image(htmlContent);

        if (base64Image) {
            callback(null, `data:image/jpeg;base64,${base64Image}`);
        } else {
            callback('Image not found');
        }
    } catch (error) {
        console.error('Error fetching the HTML content:', error);
        callback('Error fetching the HTML content');
    }
}

function extractBase64Image(html) {
    const imgTagStart = html.indexOf('<img id="OB1_Image" src="data:image/jpeg;base64,');
    if (imgTagStart === -1) {
        return null;
    }

    const base64Start = html.indexOf('base64,', imgTagStart) + 7;
    const base64End = html.indexOf('"', base64Start);
    return html.substring(base64Start, base64End);
}
