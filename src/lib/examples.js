// Curated example requests against public test APIs (verified live).

let n = 0;
const row = (key, value) => {
  n += 1;
  return { id: `ex${n}`, enabled: true, key, value };
};

const blankBody = () => ({ type: 'none', json: '', text: '', form: [], urlencoded: [] });

export const EXAMPLES = [
  {
    id: 'ex-users',
    titleKey: 'exGetUsers',
    descKey: 'exGetUsersDesc',
    method: 'GET',
    request: {
      method: 'GET',
      url: 'https://jsonplaceholder.typicode.com/users/1',
      params: [],
      headers: [row('Accept', 'application/json')],
      auth: { type: 'none' },
      body: blankBody(),
      timeout: 30,
    },
  },
  {
    id: 'ex-product',
    titleKey: 'exGetProduct',
    descKey: 'exGetProductDesc',
    method: 'GET',
    request: {
      method: 'GET',
      url: 'https://dummyjson.com/products/1',
      params: [],
      headers: [row('Accept', 'application/json')],
      auth: { type: 'none' },
      body: blankBody(),
      timeout: 30,
    },
  },
  {
    id: 'ex-post',
    titleKey: 'exPost',
    descKey: 'exPostDesc',
    method: 'POST',
    request: {
      method: 'POST',
      url: 'https://httpbin.org/post',
      params: [],
      headers: [row('Accept', 'application/json')],
      auth: { type: 'none' },
      body: {
        type: 'json',
        json: JSON.stringify({ name: 'Jon', role: 'Finance Manager' }, null, 2),
        text: '',
        form: [],
        urlencoded: [],
      },
      timeout: 30,
    },
  },
  {
    id: 'ex-params',
    titleKey: 'exParams',
    descKey: 'exParamsDesc',
    method: 'GET',
    request: {
      method: 'GET',
      url: 'https://httpbin.org/get',
      params: [row('page', '2'), row('limit', '20'), row('search', 'john')],
      headers: [row('Accept', 'application/json')],
      auth: { type: 'none' },
      body: blankBody(),
      timeout: 30,
    },
  },
  {
    id: 'ex-headers',
    titleKey: 'exHeaders',
    descKey: 'exHeadersDesc',
    method: 'GET',
    request: {
      method: 'GET',
      url: 'https://httpbin.org/headers',
      params: [],
      headers: [row('Accept', 'application/json'), row('X-Demo-Header', 'fetchlab')],
      auth: { type: 'none' },
      body: blankBody(),
      timeout: 30,
    },
  },
];
