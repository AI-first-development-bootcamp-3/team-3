import { Controller, useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Button, DatePicker, Form, Input, TimePicker } from 'antd'
import dayjs from 'dayjs'
import {
  sampleFormSchema,
  type SampleFormValues,
} from './SampleForm.schema'

const TIME_FORMAT = 'HH:mm'

/**
 * Pattern reference for how forms are built in this app: React Hook Form +
 * Zod for schema-driven, independently testable validation, Ant Design's
 * inputs for rendering only via Controller. See SCRUM-37's design.md.
 */
function SampleForm() {
  const {
    control,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<SampleFormValues>({
    resolver: zodResolver(sampleFormSchema),
    defaultValues: { name: '', startTime: '', endTime: '' },
  })

  const onSubmit = (values: SampleFormValues) => {
    // Sample only - a real Story would call the API client here.
    console.log('Sample form submitted:', values)
    reset()
  }

  return (
    <Form layout="vertical" onFinish={handleSubmit(onSubmit)}>
      <Form.Item
        label="Name"
        validateStatus={errors.name ? 'error' : ''}
        help={errors.name?.message}
      >
        <Controller
          name="name"
          control={control}
          render={({ field }) => <Input {...field} />}
        />
      </Form.Item>

      <Form.Item
        label="Start time"
        validateStatus={errors.startTime ? 'error' : ''}
        help={errors.startTime?.message}
      >
        <Controller
          name="startTime"
          control={control}
          render={({ field }) => (
            <TimePicker
              format={TIME_FORMAT}
              value={field.value ? dayjs(field.value, TIME_FORMAT) : null}
              onChange={(value) =>
                field.onChange(value ? value.format(TIME_FORMAT) : '')
              }
            />
          )}
        />
      </Form.Item>

      <Form.Item
        label="End time"
        validateStatus={errors.endTime ? 'error' : ''}
        help={errors.endTime?.message}
      >
        <Controller
          name="endTime"
          control={control}
          render={({ field }) => (
            <TimePicker
              format={TIME_FORMAT}
              value={field.value ? dayjs(field.value, TIME_FORMAT) : null}
              onChange={(value) =>
                field.onChange(value ? value.format(TIME_FORMAT) : '')
              }
            />
          )}
        />
      </Form.Item>

      <Button type="primary" htmlType="submit">
        Submit
      </Button>

      {/*
        Not part of the form's own validated schema - a standalone sample
        proving the date library + Hebrew locale render correctly. See
        SCRUM-38's design.md.
      */}
      <Form.Item label="Sample date (SCRUM-38)">
        <DatePicker />
      </Form.Item>
    </Form>
  )
}

export default SampleForm
