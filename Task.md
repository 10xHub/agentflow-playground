Now lets start Implementing the the main chat,

We have two pages to implement

There are to page, first one empty chat page and second one is the chat page with the chat history

Now we have two Options to Implement that

1. Invoke Mode
2. Stream Mode

Invoke API:

```curl
curl -X 'POST' \
  'http://127.0.0.1:8000/v1/graph/invoke' \
  -H 'accept: application/json' \
  -H 'Content-Type: application/json' \
  -d '{
  "messages": [
    {
      "message_id": 0,
      "role": "user",
      "content": "hi"
    }
  ],
  "initial_state": {
  },
  "config": {
  },
  "recursion_limit": 25,
  "response_granularity": "low",
  "include_raw": false
}'
```

Data like initial_state, config, recursion_limit, response_granularity, include_raw
these data you have to take from the `ThreadDetails` sheet, you can config

In that sheet you have an option to set stream mode or invoke mode

Based on that you have to call the API

Now this is stream mode API

```curl
curl -X 'POST' \
  'http://127.0.0.1:8000/v1/graph/stream' \
  -H 'accept: application/json' \
  -H 'Content-Type: application/json' \
  -d '{
  "messages": [
    {
      "message_id": 0,
      "role": "user",
      "content": "string"
    }
  ],
  "initial_state": {
  },
  "config": {
  },
  "recursion_limit": 25,
  "response_granularity": "low",
  "include_raw": false
}'
```

Now please implement both modes in the chat page

These message details you should save into the redux store

In future we will create an api to load the chat history, that time we just need to
update the redux store
