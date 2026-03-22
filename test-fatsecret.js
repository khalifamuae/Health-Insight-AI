const clientId = "b05a23d48f30473e913d510cbb849edf";
const clientSecret = "5309bbf3e588493695e37ab4f93ffc58";

async function run() {
    const auth = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');
    const tokenRes = await fetch("https://oauth.api.fatsecret.com/connect/token", {
        method: "POST",
        headers: {
            "Authorization": `Basic ${auth}`,
            "Content-Type": "application/x-www-form-urlencoded"
        },
        body: "grant_type=client_credentials&scope=basic"
    });
    const tokenData = await tokenRes.json();
    console.log("Token:", tokenData);

    const barcode = "5411188110836"; // Some alpro milk or random barcode
    const findRes = await fetch(`https://platform.fatsecret.com/rest/server.api?method=food.find_id_for_barcode&barcode=${barcode}&format=json`, {
        headers: { "Authorization": `Bearer ${tokenData.access_token}` }
    });
    const findData = await findRes.json();
    console.log("Find:", JSON.stringify(findData, null, 2));

    if (findData.food_id?.value) {
        const id = findData.food_id.value;
        const getRes = await fetch(`https://platform.fatsecret.com/rest/server.api?method=food.get.v3&food_id=${id}&format=json`, {
            headers: { "Authorization": `Bearer ${tokenData.access_token}` }
        });
        const getData = await getRes.json();
        console.log("Food:", JSON.stringify(getData, null, 2));
    }
}
run();
