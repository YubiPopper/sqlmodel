# SQLModel Examples

This directory contains example database models that users can load into SQLModel. You can contribute your own examples by following the format below.

## File Structure

- `index.json` - Lists all available examples with metadata
- `*.json` - Individual example model files

## Adding a New Example

1. Create a new JSON file (e.g., `my-example.json`) with your model data
2. Add an entry to `index.json` with metadata about your example
3. Submit a pull request!

## Example File Format

Each example file should have this structure:

```json
{
  "name": "Example Name",
  "description": "Brief description of the model",
  "conceptual": {
    "entities": [
      {
        "id": "unique-id-1",
        "name": "Entity Name",
        "description": "What this entity represents"
      }
    ],
    "relationships": [
      {
        "id": "rel-id-1",
        "fromEntityId": "unique-id-1",
        "toEntityId": "unique-id-2",
        "label": "relationship label",
        "fromCardinality": "0..*",
        "toCardinality": "1"
      }
    ],
    "groups": []
  },
  "physical": {
    "tables": [
      {
        "id": "table-id-1",
        "entityId": "unique-id-1",
        "name": "table_name",
        "attributes": [
          {
            "id": "attr-id-1",
            "name": "column_name",
            "dataType": "varchar",
            "isPrimaryKey": true,
            "isNullable": false,
            "isForeignKey": false
          }
        ]
      }
    ],
    "foreignKeys": [
      {
        "id": "fk-id-1",
        "fromTableId": "table-id-1",
        "toTableId": "table-id-2",
        "fromAttributeId": "attr-id-1",
        "toAttributeId": "attr-id-2",
        "fromCardinality": "0..*",
        "toCardinality": "1",
        "edgeType": "smoothstep"
      }
    ]
  }
}
```

## Index.json Format

Add an entry to the `examples` array in `index.json`:

```json
{
  "id": "my-example",
  "name": "My Example",
  "description": "Brief description for the dialog",
  "icon": "Database",
  "entityCount": 3,
  "tableCount": 3,
  "tags": ["Industry", "Category"],
  "file": "my-example.json"
}
```

### Available Icons
- `Database`
- `ShoppingCart`
- `FileText`
- `FolderKanban`

### Suggested Tags
- **Industry**: Education, Healthcare, Finance, Retail, etc.
- **Type**: SaaS, Enterprise, Nonprofit, etc.
- **Domain**: CRM, ERP, Analytics, etc.

## Cardinality Options
- `"1"` - Exactly one
- `"0..1"` - Zero or one
- `"1..*"` - One or more
- `"0..*"` - Zero or more

## Common Data Types
- `uuid`, `int`, `bigint`, `smallint`
- `varchar`, `text`, `char`
- `boolean`, `bit`
- `date`, `time`, `timestamp`, `datetime`
- `decimal`, `numeric`, `float`, `double`
- `json`, `jsonb`, `xml`

## Tips for Good Examples

1. **Keep it focused** - 3-6 entities is ideal for an example
2. **Use realistic names** - Follow database naming conventions
3. **Add descriptions** - Help users understand the model
4. **Include relationships** - Show meaningful connections
5. **Use appropriate cardinality** - Reflect real-world constraints
6. **Add relevant tags** - Help users find your example

## Validation

Before submitting, verify your JSON:
1. Valid JSON syntax (use a validator)
2. All IDs are unique within the file
3. All referenced IDs exist (entityId, tableId, etc.)
4. Foreign keys reference valid attributes
5. Cardinality values use valid options

## License

By contributing examples, you agree to make them available under the same license as SQLModel.
