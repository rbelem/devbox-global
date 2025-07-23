bleopt input_encoding=UTF-8
bleopt prompt_eol_mark=
bleopt filename_ls_colors="$LS_COLORS"
bleopt term_index_colors=auto
bleopt complete_menu_style=desc

ble-face -s varname_array             fg=silver,bold
ble-face -s varname_empty             fg=white,bold
ble-face -s varname_export            fg=silver,bold
ble-face -s varname_expr              fg=silver,bold
ble-face -s varname_hash              fg=silver,bold
ble-face -s varname_number            fg=silver,bold
ble-face -s varname_readonly          fg=silver,bold
ble-face -s varname_transform         fg=silver,bold
ble-face -s varname_unset             fg=white,bold

ble-face -s auto_complete             fg=#6b7066,bg=#363646
ble-face -s argument_option           fg=magenta

ble-face -s region                    fg=smoke,bg=thunder
ble-face -s region_insert             fg=silver
ble-face -s region_match              fg=silver,bold
ble-face -s region_target             fg=silver

ble-face -s syntax_brace              fg=smoke
ble-face -s syntax_command            fg=smoke
ble-face -s syntax_comment            fg=silver
ble-face -s syntax_default            fg=silver
ble-face -s syntax_delimiter          fg=smoke
ble-face -s syntax_document           fg=brown
ble-face -s syntax_document_begin     fg=brown,bold
ble-face -s syntax_error              fg=white,italic,strike
ble-face -s syntax_escape             fg=brown
ble-face -s syntax_expr               fg=brown
ble-face -s syntax_function_name      fg=yellow
ble-face -s syntax_glob               fg=brown
ble-face -s syntax_history_expansion  fg=silver
ble-face -s syntax_param_expansion    fg=olive,bold
ble-face -s syntax_quotation          fg=brown
ble-face -s syntax_quoted             fg=silver
ble-face -s syntax_tilde              fg=smoke
ble-face -s syntax_varname            fg=silver,bold

ble-face -s filename_block            fg=yellow,bg=black,bold
ble-face -s filename_character        fg=yellow,bg=black,bold
ble-face -s filename_directory        fg=navy,bold
ble-face -s filename_directory_sticky fg=black,bg=lime
ble-face -s filename_executable       fg=lime,bold
ble-face -s filename_link             fg=teal,bold
ble-face -s filename_ls_colors        none
ble-face -s filename_orphan           fg=white,bg=red,bold,blink
ble-face -s filename_other            fg=white
ble-face -s filename_pipe             fg=yellow
ble-face -s filename_setgid           fg=black,bg=yellow
ble-face -s filename_setuid           fg=silver,bg=red
ble-face -s filename_socket           fg=magenta,bold
ble-face -s filename_url              fg=silver,underline
ble-face -s filename_warning          fg=silver,bg=wine,bold,blink

ble-face -s command_alias             fg=teal,italic
ble-face -s command_builtin           fg=brown
ble-face -s command_builtin_dot       fg=brown,bold
ble-face -s command_directory         fg=navy,bold
ble-face -s command_file              fg=lime,bold
ble-face -s command_function          fg=yellow
ble-face -s command_jobs              fg=red,bold
ble-face -s command_keyword           fg=magenta

ble-face -s cmdinfo_cd_cdpath         fg=silver
ble-face -s disabled                  fg=black
ble-face -s overwrite_mode            fg=black
ble-face -s prompt_status_line        fg=silver

ble-face -s vbell                     reverse
ble-face -s vbell_erase               invis
ble-face -s vbell_flash               fg=yellow,reverse

ble-import vim-airline
bleopt vim_airline_theme=dark
bleopt vim_airline_section_a='\e[1m\q{lib/vim-airline/mode}'
bleopt vim_airline_section_b='\w'
bleopt vim_airline_section_c=
bleopt vim_airline_section_x=
bleopt vim_airline_section_y=
bleopt vim_airline_section_z=
bleopt vim_airline_left_sep=
bleopt vim_airline_left_alt_sep=
bleopt vim_airline_right_sep=
bleopt vim_airline_right_alt_sep=
bleopt vim_airline_symbol_branch=$' '
bleopt vim_airline_symbol_dirty=' +'
ble-face -s vim_airline_a_normal               fg=silver,bg=none,bold
ble-face -s vim_airline_a_insert               fg=purple,bg=none,bold
ble-face -s vim_airline_a_replace              fg=olive,bg=none,bold
ble-face -s vim_airline_a_visual               fg=brown,bg=none,bold
ble-face -s vim_airline_a_commandline          fg=purple,bg=none,bold
ble-face -s vim_airline_a_inactive             fg=white,bg=none,bold

for mode in normal insert replace visual commandline inactive; do
    ble-face -s vim_airline_b_"$mode"           fg=teal,bg=none
    ble-face -s vim_airline_c_"$mode"           fg=navy,bg=none,bold
    ble-face -s vim_airline_x_"$mode"           fg=silver,bg=none
    ble-face -s vim_airline_y_"$mode"           fg=silver,bg=none
    ble-face -s vim_airline_z_"$mode"           ref:vim_airline_a_"$mode"
    ble-face -s vim_airline_error_"$mode"       fg=silver,bg=brown,bold,blink
    ble-face -s vim_airline_term_"$mode"        bg=none
    ble-face -s vim_airline_warning_"$mode"     bg=none
done

# Vim mode cursor shape settings
ble-bind -m vi_cmap --cursor 0
ble-bind -m vi_imap --cursor 1
ble-bind -m vi_nmap --cursor 2
ble-bind -m vi_omap --cursor 4
ble-bind -m vi_smap --cursor 2
ble-bind -m vi_xmap --cursor 2
