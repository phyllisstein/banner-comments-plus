# Change Log

Format: [Keep a Changelog](http://keepachangelog.com/)

Adheres: [Semantic Versioning](http://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [0.3.1] - 2018-02-24

Readme, icon, package updates for discoverability. Nothing more, sorry.


## [0.3.0] - 2018-02-24

New Commands, New Font, and README updates 😁

### Added

- commands
  - `AddCustomFont` - add your own .flf font to figlet
  - `RemoveCustomFont` - remove font from custom list
  - `AddNewConfig` - create new config using menus - it's alright
- configurations
  - `customFonts` - array of file paths to custom .flf fonts
- fonts
  - "ANSI Slim" added

### Fixed

- Work with custom "languages" and their comment styles
  - no longer limited to vscode implemented
  - if multiple definitions of langConfig, picks first one to define comments
  - aka, now works with markdown :)

### ANSI Slim Example

![example ANSI Slim font](images/ANSI_Slim_example.png)


## [0.2.3] - 2018-02-22

still learning the tools for publish and versioning, sorry

### Fixed
- Fix added-font reference issue, sorry



## [0.2.1] - 2018-02-22

### Fixed
- trimTrailingWhitespace now fixed. Dumb human error



## [0.2.0] - 2018-02-18

lunar_limbo forks, stumbles, refactors 😅

### Added

- configurations
  - `trimEmptyLines` - remove output lines with only spaces
  - `prefix` - string to place before banner
  - `suffix` - string to place after banner
  - `perLinePrefix` - string to place at the beginning of each line
  - `commentStyle` - How comments are used in the output ['block', 'line', 'both', 'smart']
  - `configDescriptionKeys` - list of keys to display in ApplyFromConfig picker
  - `configs` - a hash of named configs for easy use
- commands
  - `ApplyFromList` - pick font from full list before applying defaults
  - `ApplyFromFavorite` - pick font from favorites before applying defaults
  - `ApplyFromConfig` - pick stored config to apply with (works with geddski.macros)
- features
  - implemented abiltiy to add more fonts I have picked

### Changed

- All `Apply` commands automatically selects the entire line if selection length = 0
- configurations and commands prefix change from extension.bannerComment -> banner-comments-plus.
- Changed naming conventions of commands
  - extension.bannerCommentApply -> banner-comment-plus.Apply
  - extension.bannerCommentSetFont -> banner-comment-plus.SetDefaultFont
  - extension.bannerCommentPickFromFavorites -> banner-comment-plus.SetDefaultFontFromFavorites
  - extension.bannerCommentAddAFontToFavorites -> banner-comment-plus.AddFontToFavorites
  - extension.bannerCommentAddCurrentFontToFavorites -> banner-comment-plus.AddCurrentFontToFavorites
  - extension.bannerCommentRemoveFromFavorites -> banner-comment-plus.RemoveFontFromFavorites



## [0.1.0] - 2017-10-22

Initial release by IMFUZZ

### Added

- configurations
  - `font` - Name of default figlet font to use
  - `favorites`- List of favorite fonts
  - `trimTrailingWhitespace` - scrub extra spaces at end of line
- commands
  - extension.bannerCommentApply
  - extension.bannerCommentSetFont
  - extension.bannerCommentPickFromFavorites
  - extension.bannerCommentAddAFontToFavorites
  - extension.bannerCommentAddCurrentFontToFavorites
  - extension.bannerCommentRemoveFromFavorites