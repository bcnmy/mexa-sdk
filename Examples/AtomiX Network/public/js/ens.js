async function namehash(_address = ethereum.selectedAddress) {
    let promise = new Promise((res, rej) => {

        fetch(`/enslookup?address=${_address}`)
        .then(blob => blob.json())
        .then(json => {
            res(json['node'].slice(2,));
        })
        .catch(e => rej(e));
    });

    let result = await promise;
    console.log(result);
    return result;
}
