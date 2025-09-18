Now We need to change this state with dynamic data as well,
Currently we have 3 things

- context_summary
- context
- execution_meta

These are common across all the agent states

Now We need to get the dynamic data from api
Hit this api to get the dynamic data

```http
curl -X 'GET' \
  'http://127.0.0.1:8000/v1/graph:StateSchema' \
  -H 'accept: application/json'
```

```Response
{
  "data": {
    "$defs": {
      "ExecutionState": {
        "description": "Tracks the internal execution state of a graph.\n\nThis class manages the execution progress, interrupt status, and internal\ndata that should not be exposed to users.",
        "properties": {
          "current_node": {
            "title": "Current Node",
            "type": "string"
          },
          "step": {
            "default": 0,
            "title": "Step",
            "type": "integer"
          },
          "status": {
            "$ref": "#/$defs/ExecutionStatus",
            "default": "running"
          },
          "interrupted_node": {
            "anyOf": [
              {
                "type": "string"
              },
              {
                "type": "null"
              }
            ],
            "default": null,
            "title": "Interrupted Node"
          },
          "interrupt_reason": {
            "anyOf": [
              {
                "type": "string"
              },
              {
                "type": "null"
              }
            ],
            "default": null,
            "title": "Interrupt Reason"
          },
          "interrupt_data": {
            "anyOf": [
              {
                "additionalProperties": true,
                "type": "object"
              },
              {
                "type": "null"
              }
            ],
            "default": null,
            "title": "Interrupt Data"
          },
          "thread_id": {
            "anyOf": [
              {
                "type": "string"
              },
              {
                "type": "null"
              }
            ],
            "default": null,
            "title": "Thread Id"
          },
          "internal_data": {
            "additionalProperties": true,
            "title": "Internal Data",
            "type": "object"
          }
        },
        "required": [
          "current_node"
        ],
        "title": "ExecutionState",
        "type": "object"
      },
      "ExecutionStatus": {
        "description": "Status of graph execution.",
        "enum": [
          "running",
          "interrupted_before",
          "interrupted_after",
          "completed",
          "error"
        ],
        "title": "ExecutionStatus",
        "type": "string"
      },
      "Message": {
        "description": "Represents a message in a conversation, including content, role, metadata, and token usage.\n\nExample:\n    >>> msg = Message(message_id=\"abc123\", role=\"user\", content=\"Hello!\")\n    {'message_id': 'abc123', 'role': 'user', 'content': 'Hello!', ...}\n\nAttributes:\n    message_id (str): Unique identifier for the message.\n    role (Literal[\"user\", \"assistant\", \"system\", \"tool\"]): The role of the message sender.\n    content (str): The message content.\n    tools_calls (list[dict[str, Any]] | None): Tool call information, if any.\n    tool_call_id (str | None): Tool call identifier, if any.\n    function_call (dict[str, Any] | None): Function call information, if any.\n    reasoning (str | None): Reasoning or explanation, if any.\n    timestamp (datetime | None): Timestamp of the message.\n    metadata (dict[str, Any]): Additional metadata.\n    usages (TokenUsages | None): Token usage statistics.\n    raw (dict[str, Any] | None): Raw data, if any.",
        "properties": {
          "message_id": {
            "anyOf": [
              {
                "type": "string"
              },
              {
                "type": "integer"
              }
            ],
            "title": "Message Id"
          },
          "role": {
            "enum": [
              "user",
              "assistant",
              "system",
              "tool"
            ],
            "title": "Role",
            "type": "string"
          },
          "content": {
            "title": "Content",
            "type": "string"
          },
          "tools_calls": {
            "anyOf": [
              {
                "items": {
                  "additionalProperties": true,
                  "type": "object"
                },
                "type": "array"
              },
              {
                "type": "null"
              }
            ],
            "default": null,
            "title": "Tools Calls"
          },
          "tool_call_id": {
            "anyOf": [
              {
                "type": "string"
              },
              {
                "type": "null"
              }
            ],
            "default": null,
            "title": "Tool Call Id"
          },
          "function_call": {
            "anyOf": [
              {
                "additionalProperties": true,
                "type": "object"
              },
              {
                "type": "null"
              }
            ],
            "default": null,
            "title": "Function Call"
          },
          "reasoning": {
            "anyOf": [
              {
                "type": "string"
              },
              {
                "type": "null"
              }
            ],
            "default": null,
            "title": "Reasoning"
          },
          "timestamp": {
            "anyOf": [
              {
                "format": "date-time",
                "type": "string"
              },
              {
                "type": "null"
              }
            ],
            "title": "Timestamp"
          },
          "metadata": {
            "additionalProperties": true,
            "title": "Metadata",
            "type": "object"
          },
          "usages": {
            "anyOf": [
              {
                "$ref": "#/$defs/TokenUsages"
              },
              {
                "type": "null"
              }
            ],
            "default": null
          },
          "raw": {
            "anyOf": [
              {
                "additionalProperties": true,
                "type": "object"
              },
              {
                "type": "null"
              }
            ],
            "default": null,
            "title": "Raw"
          }
        },
        "required": [
          "message_id",
          "role",
          "content"
        ],
        "title": "Message",
        "type": "object"
      },
      "TokenUsages": {
        "description": "Tracks token usage statistics for a message or model response.\n\nExample:\n    >>> usage = TokenUsages(completion_tokens=10, prompt_tokens=20, total_tokens=30)\n    {'completion_tokens': 10, 'prompt_tokens': 20, 'total_tokens': 30, ...}",
        "properties": {
          "completion_tokens": {
            "title": "Completion Tokens",
            "type": "integer"
          },
          "prompt_tokens": {
            "title": "Prompt Tokens",
            "type": "integer"
          },
          "total_tokens": {
            "title": "Total Tokens",
            "type": "integer"
          },
          "reasoning_tokens": {
            "default": 0,
            "title": "Reasoning Tokens",
            "type": "integer"
          },
          "cache_creation_input_tokens": {
            "default": 0,
            "title": "Cache Creation Input Tokens",
            "type": "integer"
          },
          "cache_read_input_tokens": {
            "default": 0,
            "title": "Cache Read Input Tokens",
            "type": "integer"
          }
        },
        "required": [
          "completion_tokens",
          "prompt_tokens",
          "total_tokens"
        ],
        "title": "TokenUsages",
        "type": "object"
      }
    },
    "properties": {
      "context": {
        "items": {
          "$ref": "#/$defs/Message"
        },
        "title": "Context",
        "type": "array"
      },
      "context_summary": {
        "anyOf": [
          {
            "type": "string"
          },
          {
            "type": "null"
          }
        ],
        "default": null,
        "title": "Context Summary"
      },
      "execution_meta": {
        "$ref": "#/$defs/ExecutionState"
      },
      "jd_text": {
        "default": "",
        "title": "Jd Text",
        "type": "string"
      },
      "cv_text": {
        "default": "",
        "title": "Cv Text",
        "type": "string"
      }
    },
    "title": "CustomAgentState",
    "type": "object"
  },
  "metadata": {
    "request_id": "a7eb6f95-8821-47e3-9ccd-be3ed0e68cbe",
    "timestamp": "2025-09-18T20:11:58.809039",
    "message": "OK"
  }
}
```

Please use transtack query and cache it for 30 minutes.
Then consume that data in the ui

All the axios code available in src/services/api/state.api.js
Transtack query available in src/services/query/state.query.js

Please intregrate it properly...

Remember we already completed Context, Summary and Execution Meta
