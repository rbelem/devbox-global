bleopt input_encoding=UTF-8
bleopt prompt_eol_mark=
bleopt filename_ls_colors="$LS_COLORS"
bleopt term_index_colors=auto
bleopt complete_menu_style=desc

# =============================================================================
# Kanagawa Colorschemes for ble.sh
# Supports: wave (dark) and lotus (light)
#
# Override:  export BLE_KANAGAWA_THEME=wave|lotus
# Default:   wave (dark)
#
# NOTE: syntax_default / syntax_command inherit terminal's native fg.
#       Only highlight/decoration faces use Kanagawa hex colors.
# =============================================================================

function ble-kanagawa-wave {
  # ── Syntax highlights (dark bg) ──
  ble-face -s syntax_quoted            fg=#98BB6C        # strings         → springGreen
  ble-face -s syntax_quotation         fg=#98BB6C        # quotes          → springGreen
  ble-face -s syntax_escape            fg=#7FB4CA        # escapes         → springBlue
  ble-face -s syntax_expr              fg=#E6C384        # expr            → carpYellow
  ble-face -s syntax_varname           fg=#DCD7BA,bold   # varnames        → fujiWhite
  ble-face -s syntax_param_expansion   fg=#9CABCA,bold   # ${}             → springViolet2
  ble-face -s syntax_glob              fg=#E46876        # globs           → waveRed
  ble-face -s syntax_delimiter         fg=#54546D        # ; | & etc       → sumiInk6
  ble-face -s syntax_comment           fg=#727169,italic # comments        → fujiGray
  ble-face -s syntax_error             fg=#E82424,italic,strike
  ble-face -s syntax_function_name     fg=#7E9CD8        # functions       → crystalBlue
  ble-face -s syntax_document          fg=#FFA066        # heredocs        → surimiOrange
  ble-face -s syntax_document_begin    fg=#FFA066,bold
  ble-face -s syntax_history_expansion fg=#C8C093        # !! !$ !*        → oldWhite

  # ── Commands ──
  ble-face -s command_builtin          fg=#E46876        # builtins        → waveRed
  ble-face -s command_builtin_dot      fg=#E46876,bold
  ble-face -s command_alias            fg=#7FB4CA,italic # aliases         → springBlue
  ble-face -s command_function         fg=#7E9CD8        # functions       → crystalBlue
  ble-face -s command_file             fg=#76946A,bold   # executables     → autumnGreen
  ble-face -s command_directory        fg=#7E9CD8,bold   # dirs as cmds    → crystalBlue
  ble-face -s command_keyword          fg=#957FB8        # if/then/etc     → oniViolet
  ble-face -s command_jobs             fg=#FF5D62,bold   # %1 %2           → peachRed

  # ── Arguments / Options ──
  ble-face -s argument_option          fg=#938AA9        # --flags         → springViolet1

  # ── Filenames ──
  ble-face -s filename_directory        fg=#7E9CD8,bold
  ble-face -s filename_directory_sticky fg=#16161D,bg=#76946A
  ble-face -s filename_executable       fg=#76946A,bold
  ble-face -s filename_link             fg=#7FB4CA,bold
  ble-face -s filename_orphan           fg=#DCD7BA,bg=#E82424,bold,blink
  ble-face -s filename_setuid           fg=#C8C093,bg=#E82424
  ble-face -s filename_setgid           fg=#16161D,bg=#DCA561
  ble-face -s filename_socket           fg=#D27E99,bold
  ble-face -s filename_pipe             fg=#DCA561
  ble-face -s filename_character        fg=#DCA561,bg=#16161D,bold
  ble-face -s filename_block            fg=#DCA561,bg=#16161D,bold
  ble-face -s filename_warning          fg=#DCD7BA,bg=#FF5D62,bold,blink
  ble-face -s filename_url              fg=#DCD7BA,underline
  ble-face -s filename_other            fg=#DCD7BA
  ble-face -s filename_ls_colors        none

  # ── Variables ──
  ble-face -s varname_unset            fg=#DCD7BA
  ble-face -s varname_empty            fg=#DCD7BA
  ble-face -s varname_number           fg=#D27E99,bold  # integers        → sakuraPink
  ble-face -s varname_readonly         fg=#D27E99,bold
  ble-face -s varname_export           fg=#DCD7BA
  ble-face -s varname_array            fg=#DCD7BA
  ble-face -s varname_hash             fg=#DCD7BA
  ble-face -s varname_transform        fg=#DCD7BA
  ble-face -s varname_expr             fg=#DCD7BA

  # ── Region / Selection ──
  ble-face -s region                   fg=#DCD7BA,bg=#223249
  ble-face -s region_insert            fg=#C8C093
  ble-face -s region_match             fg=#DCD7BA,bold
  ble-face -s region_target            fg=#DCD7BA

  # ── Auto-complete ──
  ble-face -s auto_complete            fg=#C8C093,bg=#2A2A37

  # ── Misc ──
  ble-face -s disabled                 fg=#54546D
  ble-face -s overwrite_mode           fg=#16161D
  ble-face -s prompt_status_line       fg=#C8C093
  ble-face -s vbell                    reverse
  ble-face -s vbell_erase              invis
  ble-face -s vbell_flash              fg=#DCA561,reverse

  # ── Vim-airline (tmux-powerkit kanagawa dragon) ──
  bleopt vim_airline_theme=dark

  local fg=#545464 fgd=#8a8980 inactive=#a09cac
  local accent=#b35b79 good=#6f894e warning=#cc6d00 info=#4d699b
  ble-face -s vim_airline_a_normal       fg=#f2ecbc,bg="$accent",bold
  ble-face -s vim_airline_a_insert       fg=#f2ecbc,bg="$good",bold
  ble-face -s vim_airline_a_replace      fg=#f2ecbc,bg="$warning",bold
  ble-face -s vim_airline_a_visual       fg=#f2ecbc,bg="$info",bold
  ble-face -s vim_airline_a_commandline  fg=#f2ecbc,bg="$info",bold
  ble-face -s vim_airline_a_inactive     fg="$fgd",bg=#e7dba0,bold

  for mode in normal insert replace visual commandline inactive; do
    ble-face -s vim_airline_b_"$mode"       fg="$good",bg=none
    ble-face -s vim_airline_c_"$mode"       fg="$fg",bg=none,bold
    ble-face -s vim_airline_x_"$mode"       fg="$fgd",bg=none
    ble-face -s vim_airline_y_"$mode"       fg="$fgd",bg=none
    ble-face -s vim_airline_z_"$mode"       ref:vim_airline_a_"$mode"
    ble-face -s vim_airline_error_"$mode"   fg=#f2ecbc,bg=#c84053,bold,blink
    ble-face -s vim_airline_term_"$mode"    bg=none
    ble-face -s vim_airline_warning_"$mode" bg=none
  done
}

function ble-kanagawa-lotus {
  # ── Lotus (light bg) ──
  ble-face -s syntax_quoted            fg=#6f894e        # strings         → lotusGreen
  ble-face -s syntax_quotation         fg=#6f894e
  ble-face -s syntax_escape            fg=#6693bf        # escapes         → lotusTeal2
  ble-face -s syntax_expr              fg=#77713f        # expr            → lotusYellow
  ble-face -s syntax_varname           fg=#545464,bold   # varnames        → lotusInk1
  ble-face -s syntax_param_expansion   fg=#5d57a3,bold   # ${}             → lotusBlue5
  ble-face -s syntax_glob              fg=#c84053        # globs           → lotusRed
  ble-face -s syntax_delimiter         fg=#a09cac        # ; | & etc       → lotusViolet1
  ble-face -s syntax_comment           fg=#8a8980,italic # comments        → lotusGray3
  ble-face -s syntax_error             fg=#e82424,italic,strike
  ble-face -s syntax_function_name     fg=#4d699b        # functions       → lotusBlue4
  ble-face -s syntax_document          fg=#cc6d00        # heredocs        → lotusOrange
  ble-face -s syntax_document_begin    fg=#cc6d00,bold
  ble-face -s syntax_history_expansion fg=#43436c        # !! !$ !*        → lotusInk2

  ble-face -s command_builtin          fg=#c84053
  ble-face -s command_builtin_dot      fg=#c84053,bold
  ble-face -s command_alias            fg=#6693bf,italic
  ble-face -s command_function         fg=#4d699b
  ble-face -s command_file             fg=#6e915f,bold
  ble-face -s command_directory        fg=#4d699b,bold
  ble-face -s command_keyword          fg=#624c83
  ble-face -s command_jobs             fg=#d7474b,bold

  ble-face -s argument_option          fg=#a09cac

  ble-face -s filename_directory        fg=#4d699b,bold
  ble-face -s filename_directory_sticky fg=#d5cea3,bg=#6e915f
  ble-face -s filename_executable       fg=#6e915f,bold
  ble-face -s filename_link             fg=#6693bf,bold
  ble-face -s filename_orphan           fg=#f2ecbc,bg=#e82424,bold,blink
  ble-face -s filename_setuid           fg=#43436c,bg=#e82424
  ble-face -s filename_setgid           fg=#d5cea3,bg=#de9800
  ble-face -s filename_socket           fg=#b35b79,bold
  ble-face -s filename_pipe             fg=#de9800
  ble-face -s filename_character        fg=#de9800,bg=#d5cea3,bold
  ble-face -s filename_block            fg=#de9800,bg=#d5cea3,bold
  ble-face -s filename_warning          fg=#f2ecbc,bg=#d7474b,bold,blink
  ble-face -s filename_url              fg=#545464,underline
  ble-face -s filename_other            fg=#545464
  ble-face -s filename_ls_colors        none

  ble-face -s varname_unset            fg=#545464
  ble-face -s varname_empty            fg=#545464
  ble-face -s varname_number           fg=#b35b79,bold
  ble-face -s varname_readonly         fg=#b35b79,bold
  ble-face -s varname_export           fg=#545464
  ble-face -s varname_array            fg=#545464
  ble-face -s varname_hash             fg=#545464
  ble-face -s varname_transform        fg=#545464
  ble-face -s varname_expr             fg=#545464

  ble-face -s region                   fg=#545464,bg=#c9cbd1
  ble-face -s region_insert            fg=#a09cac
  ble-face -s region_match             fg=#545464,bold
  ble-face -s region_target            fg=#545464

  ble-face -s auto_complete            fg=#43436c,bg=#e7dba0

  ble-face -s disabled                 fg=#a09cac
  ble-face -s overwrite_mode           fg=#d5cea3
  ble-face -s prompt_status_line       fg=#43436c
  ble-face -s vbell                    reverse
  ble-face -s vbell_erase              invis
  ble-face -s vbell_flash              fg=#de9800,reverse

  bleopt vim_airline_theme=light
  local fg=#c5c9c5 fgd=#a6a69c inactive=#7a8382
  local accent=#8992a7 good=#87a987 warning=#b98d7b info=#8ba4b0
  ble-face -s vim_airline_a_normal       fg=#12120f,bg="$accent",bold
  ble-face -s vim_airline_a_insert       fg=#12120f,bg="$good",bold
  ble-face -s vim_airline_a_replace      fg=#12120f,bg="$warning",bold
  ble-face -s vim_airline_a_visual       fg=#12120f,bg="$info",bold
  ble-face -s vim_airline_a_commandline  fg=#12120f,bg="$info",bold
  ble-face -s vim_airline_a_inactive     fg="$fgd",bg=#282727,bold

  for mode in normal insert replace visual commandline inactive; do
    ble-face -s vim_airline_b_"$mode"       fg="$good",bg=none
    ble-face -s vim_airline_c_"$mode"       fg="$fg",bg=none,bold
    ble-face -s vim_airline_x_"$mode"       fg="$fgd",bg=none
    ble-face -s vim_airline_y_"$mode"       fg="$fgd",bg=none
    ble-face -s vim_airline_z_"$mode"       ref:vim_airline_a_"$mode"
    ble-face -s vim_airline_error_"$mode"   fg="$fg",bg=#c4746e,bold,blink
    ble-face -s vim_airline_term_"$mode"    bg=none
    ble-face -s vim_airline_warning_"$mode" bg=none
  done
}

# ─────────────────────────────────────────────────────────────────────────────
# Theme Selection
# ─────────────────────────────────────────────────────────────────────────────

_ble_kanagawa_theme="${BLE_KANAGAWA_THEME:-}"

ble-import vim-airline

if [[ -n "$TERM_BACKGROUND" ]]; then
  case "${TERM_BACKGROUND,,}" in
    light) ble-kanagawa-lotus ;;
    *)     ble-kanagawa-wave ;;
  esac
elif [[ -n "$COLORFGBG" ]]; then
  local fg_index="${COLORFGBG%%;*}"
  if (( fg_index >= 8 )); then
    ble-kanagawa-wave
  else
    ble-kanagawa-lotus
  fi
else
  ble-kanagawa-wave 
fi

unset -n c 2>/dev/null

# Vim mode cursor shape settings
ble-bind -m vi_cmap --cursor 0
ble-bind -m vi_imap --cursor 1
ble-bind -m vi_nmap --cursor 2
ble-bind -m vi_omap --cursor 4
ble-bind -m vi_smap --cursor 2
ble-bind -m vi_xmap --cursor 2

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
