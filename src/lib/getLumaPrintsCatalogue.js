var myHeaders = new Headers();

myHeaders.append("Authorization", `Basic ${btoa(`${apiKey}:${apiSecret}`)}`);

var requestOptions = {
  method: "GET",
  headers: myHeaders,
  redirect: "follow",
};

const response = await fetch(
  "https://us.api-sandbox.lumaprints.com/api/v1/products/categories",
  requestOptions
).then((response) => response.json());
//  .then(result => console.log(result))
//  .catch(error => console.log('error', error));

const categories = [
  { id: 101, name: "Canvas" },
  { id: 102, name: "Framed Canvas" },
  { id: 103, name: "Fine Art Paper" },
  { id: 105, name: "Framed Fine Art Paper" },
  { id: 106, name: "Metal" },
  { id: 107, name: "Peel and Stick" },
  { id: 108, name: "Foam-mounted Fine Art Paper" },
];



// get all subcategory options
const subcategoryOptions = Object.values(subcategories)
  .flat()
  .map((s) => {
    const scid = s.subcategoryId;
    return fetch(
      `https://us.api-sandbox.lumaprints.com/api/v1/products/subcategories/${scid}/options`,
      requestOptions
    )
      .then((response) => response.json())
      .then((result) => result)
      .catch((error) => console.log("error", error));
  });

Promise.all(subcategoryOptions).then((options) => {
  console.log(options);
});
