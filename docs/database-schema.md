# Database Schema Design

This project uses MongoDB (via Mongoose). The Mermaid ER diagram below represents the current collection design from `backend/src/models`.

```mermaid
erDiagram
    USER {
        ObjectId _id PK
        string username UK
        string email UK
        string password
        string profilePic
        string bio
        string role
        string status
        date lastSeenAt
        string resetPasswordToken
        date resetPasswordTokenExpiresAt
        date createdAt
        date updatedAt
    }

    TEAM {
        ObjectId _id PK
        string teamName
        string description
        string teamType
        ObjectId createdBy FK
        object rolePermissions
        date createdAt
        date updatedAt
    }

    TEAM_MEMBER {
        ObjectId _id PK
        ObjectId teamId FK
        ObjectId userId FK
        string memberRole
        string status
        date joinedAt
    }

    CONVERSATION {
        ObjectId _id PK
        string type
        ObjectId teamId FK
        string name
        ObjectId[] participantIds
        string lastMessage
        date createdAt
        date updatedAt
    }

    MESSAGE {
        ObjectId _id PK
        ObjectId conversationId FK
        ObjectId senderId FK
        string content
        string fileUrl
        date timestamp
        date editedAt
    }

    FRIEND_REQUEST {
        ObjectId _id PK
        ObjectId senderId FK
        ObjectId receiverId FK
        string status
        date createdAt
        date updatedAt
    }

    UPLOADED_FILE {
        ObjectId _id PK
        ObjectId uploadedBy FK
        ObjectId conversationId FK
        string fileName
        string fileType
        string fileUrl
        date uploadedAt
    }

    USER ||--o{ TEAM : "creates (createdBy)"
    TEAM ||--o{ TEAM_MEMBER : "has members"
    USER ||--o{ TEAM_MEMBER : "joins as member"

    TEAM ||--o{ CONVERSATION : "owns team conversations"
    USER }o--o{ CONVERSATION : "direct participants"

    CONVERSATION ||--o{ MESSAGE : "contains"
    USER ||--o{ MESSAGE : "sends"

    USER ||--o{ FRIEND_REQUEST : "sends"
    USER ||--o{ FRIEND_REQUEST : "receives"

    USER ||--o{ UPLOADED_FILE : "uploads"
    CONVERSATION ||--o{ UPLOADED_FILE : "stores files"
```

## Notes

- `TEAM_MEMBER` has a unique compound index on (`teamId`, `userId`).
- `FRIEND_REQUEST` has a unique partial index on (`senderId`, `receiverId`) where `status = "pending"`.
- `UPLOADED_FILE` model writes to the `files` collection.
- `CONVERSATION.participantIds` stores user references as an ObjectId array.
