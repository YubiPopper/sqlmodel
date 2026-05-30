import type { Entity, Relationship } from '../model/schemas';

export const getLinkedEntityIds = (relationships: Relationship[]) => {
  const linkedIds = new Set<string>();

  relationships.forEach((relationship) => {
    const isEntityRelationship = relationship.relationshipType === 'entity' || relationship.relationshipType === undefined;
    if (!isEntityRelationship || !relationship.fromEntityId || !relationship.toEntityId) return;
    linkedIds.add(relationship.fromEntityId);
    linkedIds.add(relationship.toEntityId);
  });

  return linkedIds;
};

export const shouldIncludeEntityForFocus = (
  entity: Entity,
  activeDataModelId: string | undefined,
  hideUnlinkedEntities: boolean,
  linkedEntityIds: Set<string>
) => {
  if (activeDataModelId && entity.dataModelId !== activeDataModelId) return false;
  if (hideUnlinkedEntities && !linkedEntityIds.has(entity.id)) return false;
  return true;
};
