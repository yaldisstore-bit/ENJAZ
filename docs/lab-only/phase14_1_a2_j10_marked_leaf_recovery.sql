-- One-time, LAB-ONLY cleanup of three RESTRICT governance leaf rows left by
-- failed linked J10. Never use on production or an unmarked workspace.
-- Service-role API deliberately cannot delete these append-only audit rows.
DO $j10_fixture_recovery$
DECLARE v_workspace uuid; v_count integer;
BEGIN
  IF (SELECT count(*) FROM auth.users) <> 1 OR
     (SELECT count(*) FROM auth.users
        WHERE raw_user_meta_data->>'enjaz_test_marker' =
          'phase14_1_a2_j04_field_real_cloud'
          AND raw_user_meta_data->>'label' = 'owner') <> 1 OR
     (SELECT count(*) FROM public.workspaces) <> 1 OR
     (SELECT count(*) FROM storage.objects) <> 0 THEN
    RAISE EXCEPTION 'ENJAZ_J10_FIXTURE_IDENTITY_DENIED';
  END IF;
  SELECT w.id INTO v_workspace
    FROM public.workspaces w
    JOIN auth.users u ON u.id = w.owner_user_id
    WHERE u.raw_user_meta_data->>'enjaz_test_marker' =
      'phase14_1_a2_j04_field_real_cloud'
      AND u.raw_user_meta_data->>'label' = 'owner';
  IF v_workspace IS NULL OR
     (SELECT count(*) FROM public.companies) <> 1 OR
     (SELECT count(*) FROM public.companies
       WHERE workspace_id = v_workspace) <> 1 OR
     (SELECT count(*) FROM public.corporate_governance_events) <> 1 OR
     (SELECT count(*) FROM public.corporate_governance_events
       WHERE workspace_id = v_workspace) <> 1 OR
     (SELECT count(*) FROM public.corporate_resolutions) <> 1 OR
     (SELECT count(*) FROM public.corporate_resolutions
       WHERE workspace_id = v_workspace) <> 1 OR
     (SELECT count(*) FROM public.corporate_registry_states) <> 1 OR
     (SELECT count(*) FROM public.corporate_registry_states
       WHERE workspace_id = v_workspace) <> 1 THEN
    RAISE EXCEPTION 'ENJAZ_J10_FIXTURE_GRAPH_DENIED';
  END IF;
  DELETE FROM public.corporate_governance_events
    WHERE workspace_id = v_workspace;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  IF v_count <> 1 THEN RAISE EXCEPTION 'ENJAZ_J10_EVENT_DELETE_UNCONFIRMED'; END IF;
  DELETE FROM public.corporate_resolutions
    WHERE workspace_id = v_workspace;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  IF v_count <> 1 THEN RAISE EXCEPTION 'ENJAZ_J10_RESOLUTION_DELETE_UNCONFIRMED'; END IF;
  DELETE FROM public.corporate_registry_states
    WHERE workspace_id = v_workspace;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  IF v_count <> 1 THEN RAISE EXCEPTION 'ENJAZ_J10_REGISTRY_DELETE_UNCONFIRMED'; END IF;
END
$j10_fixture_recovery$;
