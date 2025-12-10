-- Clean up GameSchedule entries where the lead is not on 'scheduled' stage anymore
DELETE FROM "GameSchedule" gs
WHERE NOT EXISTS (
  SELECT 1 FROM "GameLead" gl
  JOIN "GamePipelineStage" gps ON gl."stageId" = gps.id
  WHERE gs."leadId" = gl.id
  AND gps."stageType" = 'scheduled'
);
