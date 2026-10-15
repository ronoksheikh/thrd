import FormControl from '@mui/material/FormControl';
import FormHelperText from '@mui/material/FormHelperText';
import InputLabel from '@mui/material/InputLabel';
import OutlinedInput, { type OutlinedInputProps } from '@mui/material/OutlinedInput';

/** Lightweight TextField (MUI's TextField also bundles Select/Menu/Modal, which the store never uses). */
export default function Field({ id, label, helperText, error, ...rest }: OutlinedInputProps & { id: string; label: string; helperText?: string }) {
  return (
    <FormControl fullWidth error={error} variant="outlined">
      <InputLabel htmlFor={id}>{label}</InputLabel>
      <OutlinedInput id={id} label={label} {...rest} />
      {helperText && <FormHelperText>{helperText}</FormHelperText>}
    </FormControl>
  );
}
