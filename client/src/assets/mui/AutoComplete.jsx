import React from 'react';
import TextField from '@mui/material/TextField';
import Autocomplete from '@mui/material/Autocomplete';

export const AutoComplete = ({ 
  options = [], 
  getOptionLabel, 
  onChange, 
  label = 'Select',
  placeholder = 'Search...',
  value = null,
  sx = { width: 300 }
}) => {
  return (
    <Autocomplete
      value={value}
      onChange={onChange}
      options={options}
      getOptionLabel={getOptionLabel}
      sx={sx}
      renderInput={(params) => (
        <TextField 
          {...params} 
          label={label}
          placeholder={placeholder}
        />
      )}
      isOptionEqualToValue={(option, value) => option?.id === value?.id}
    />
  );
};
