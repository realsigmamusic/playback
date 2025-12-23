-- REAPER Script: Export JSON for Playback Pro
-- Autor: Real Sigma Music

function msg(m)
    reaper.ShowConsoleMsg(tostring(m) .. "\n")
end

function get_filename_without_ext(filename)
    return filename:match("(.+)%..+") or filename
end

function main()
    -- 1. Verifica projeto salvo
    local proj_path = reaper.GetProjectPath()
    if proj_path == "" then
        reaper.ShowMessageBox("Salve o projeto antes de executar.", "Erro", 0)
        return
    end

    -- 2. Pega Nome do Item
    local item = reaper.GetSelectedMediaItem(0, 0)
    local song_title = "Nova Música"
    
    if item then
        local take = reaper.GetActiveTake(item)
        if take then
            local source_name = reaper.GetTakeName(take)
            song_title = get_filename_without_ext(source_name)
        end
    else
        reaper.ShowMessageBox("Selecione o item de áudio!", "Aviso", 0)
        return
    end

    -- 3. Pega BPM
    local bpm = reaper.Master_GetTempo()
    local key = "" 

    -- 4. Coleta Marcadores
    local ret, num_markers, num_regions = reaper.CountProjectMarkers(0)
    local sections = {}
    
    local i = 0
    while i < (num_markers + num_regions) do
        local retval, isrgn, pos, rgnend, name, markrgnindexnumber = reaper.EnumProjectMarkers(i)
        if not isrgn then 
            local time_formatted = string.format("%.2f", pos)
            table.insert(sections, {label = name, time = time_formatted})
        end
        i = i + 1
    end

    if #sections == 0 then
        reaper.ShowMessageBox("Nenhum marcador encontrado!", "Erro", 0)
        return
    end

    -- 5. Monta JSON com TABULAÇÃO REAL (\t)
    local json_str = "{\n"
    json_str = json_str .. '\t"title": "' .. song_title .. '",\n'
    json_str = json_str .. '\t"artist": "",\n'
    json_str = json_str .. '\t"bpm": ' .. bpm .. ',\n'
    json_str = json_str .. '\t"key": "' .. key .. '",\n'
    json_str = json_str .. '\t"sections": [\n'

    for k, v in ipairs(sections) do
        -- Indentação nível 2 (2 tabs)
        json_str = json_str .. '\t\t{\n'
        
        -- Indentação nível 3 (3 tabs)
        json_str = json_str .. '\t\t\t"label": "' .. v.label .. '",\n'
        json_str = json_str .. '\t\t\t"time": ' .. v.time .. '\n'
        
        -- Fecha objeto nível 2 (2 tabs)
        json_str = json_str .. '\t\t}'

        if k < #sections then
            json_str = json_str .. ','
        end
        json_str = json_str .. '\n'
    end

    -- Fecha array nível 1 (1 tab)
    json_str = json_str .. '\t]\n'
    json_str = json_str .. '}'

    -- 6. Salva
    local sep = package.config:sub(1,1)
    local file_path = proj_path .. sep .. song_title .. ".json"
    
    local file = io.open(file_path, "w")
    if file then
        file:write(json_str)
        file:close()
        reaper.ShowMessageBox("JSON (Tabs) criado em:\n" .. file_path, "Sucesso", 0)
    else
        reaper.ShowMessageBox("Erro ao gravar arquivo.", "Erro", 0)
    end
end

main()
