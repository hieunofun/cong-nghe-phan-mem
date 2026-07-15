---
language: []
tags:
- sentence-transformers
- sentence-similarity
- feature-extraction
- generated_from_trainer
- dataset_size:680
- loss:CosineSimilarityLoss
base_model: sentence-transformers/paraphrase-multilingual-mpnet-base-v2
widget:
- source_sentence: 'Tôi là 2 năm kinh nghiệm, tốt nghiệp Đại học CNTT. Có kinh nghiệm
    với Kubernetes, FastAPI, Spring Boot, Redis. Kỹ năng bổ sung: Docker. Kỹ năng
    mềm: học hỏi nhanh, tư duy logic, lãnh đạo.'
  sentences:
  - 'Chúng tôi tìm kiếm Kế toán trưởng (tốt nghiệp đại học). Kỹ năng bắt buộc: MISA,
    Phân tích tài chính. Kỹ năng mong muốn: Quyết toán, Kiểm toán, Kế toán thuế.'
  - 'Vị trí API Developer - Cần người biết Linux, Microservices, Node.js và có kinh
    nghiệm junior. Thêm điểm nếu có: Redis, Spring Boot, Express.'
  - 'Tuyển dụng UI Developer. Yêu cầu: HTML, TypeScript, Vite, React, Angular, Webpack.
    Ưu tiên: Responsive Design, Bootstrap, Figma. Kinh nghiệm: 4 năm kinh nghiệm.'
- source_sentence: 'Ứng viên từ 3-5 năm chuyên về Kế toán thuế, Báo cáo tài chính,
    Thuế TNDN. Đã làm việc với Kế toán tổng hợp, Thuế GTGT, Quyết toán. Tốt nghiệp
    Đại học Bách Khoa. Tính cách: tiếng Anh tốt, lãnh đạo, làm việc nhóm.'
  sentences:
  - 'Vị trí Nhân viên kinh doanh - Cần người biết KPI doanh số, B2B, Thuyết trình
    và có kinh nghiệm từ 3-5 năm. Thêm điểm nếu có: Tìm kiếm khách hàng, Upselling,
    Đàm phán.'
  - 'Chúng tôi tìm kiếm Kế toán trưởng (4 năm kinh nghiệm). Kỹ năng bắt buộc: Thuế
    GTGT, Kế toán thuế, Thuế TNDN, Phân tích tài chính, Excel nâng cao, Kế toán tổng
    hợp. Kỹ năng mong muốn: Quyết toán, Báo cáo tài chính, MISA.'
  - 'Tuyển dụng Kiểm toán viên. Yêu cầu: Thuế GTGT, Kế toán thuế, Excel nâng cao,
    Phân tích tài chính. Ưu tiên: Báo cáo tài chính, Kiểm toán, Thuế TNDN. Kinh nghiệm:
    2 năm kinh nghiệm.'
- source_sentence: 'Tôi là tốt nghiệp đại học, tốt nghiệp Đại học CNTT. Có kinh nghiệm
    với Kế toán tổng hợp, Quyết toán, Thuế GTGT. Kỹ năng bổ sung: . Kỹ năng mềm: giao
    tiếp tốt, học hỏi nhanh, tiếng Anh tốt.'
  sentences:
  - 'Tuyển dụng Marketing Executive. Yêu cầu: Email Marketing, Google Analytics, SEO,
    Google Ads, Facebook Ads, Market Research. Ưu tiên: HubSpot, Social Media, Content
    Marketing. Kinh nghiệm: có kinh nghiệm thực tế.'
  - 'Chúng tôi tìm kiếm Digital Marketing (2 năm kinh nghiệm). Kỹ năng bắt buộc: SEO,
    Email Marketing, Brand Strategy, CRM. Kỹ năng mong muốn: Canva, HubSpot, Google
    Ads.'
  - 'Vị trí Cloud Engineer - Cần người biết Linux, GitLab CI, AWS và có kinh nghiệm
    2 năm kinh nghiệm. Thêm điểm nếu có: GCP, Terraform, Load Balancing.'
- source_sentence: 'Ứng viên middle chuyên về PHP, FastAPI, Linux. Đã làm việc với
    GraphQL, Node.js, CI/CD. Tốt nghiệp Cao đẳng nghề. Tính cách: lãnh đạo, sáng tạo,
    chịu áp lực cao.'
  sentences:
  - 'Tuyển dụng React Developer. Yêu cầu: Tailwind CSS, UI/UX, Figma, HTML. Ưu tiên:
    JavaScript, Bootstrap, Next.js. Kinh nghiệm: 1 năm kinh nghiệm.'
  - 'Vị trí DevOps Engineer - Cần người biết Ansible, AWS, Jenkins và có kinh nghiệm
    junior. Thêm điểm nếu có: Azure, Bash, Monitoring.'
  - 'Tuyển dụng Brand Manager. Yêu cầu: Copywriting, Social Media, Photoshop, Canva,
    CRM, Google Ads, Google Analytics, Email Marketing, Facebook Ads. Ưu tiên: Brand
    Strategy, Market Research, TikTok Ads. Kinh nghiệm: 5 năm kinh nghiệm.'
- source_sentence: 'Ứng viên thực tập chuyên về CRM, Market Research, TikTok Ads.
    Đã làm việc với . Tốt nghiệp Đại học Bách Khoa. Tính cách: làm việc nhóm, phân
    tích vấn đề, quản lý thời gian.'
  sentences:
  - 'Vị trí Cloud Engineer - Cần người biết Monitoring, Bash, AWS và có kinh nghiệm
    dưới 2 năm. Thêm điểm nếu có: Load Balancing, Grafana, Ansible.'
  - 'Tuyển dụng HR Executive. Yêu cầu: Onboarding, Đào tạo. Ưu tiên: Đánh giá hiệu
    suất KPI, HRIS, Payroll. Kinh nghiệm: sinh viên năm cuối.'
  - 'Tuyển dụng Digital Marketing. Yêu cầu: Content Marketing, Social Media. Ưu tiên:
    Copywriting, Market Research, CRM. Kinh nghiệm: tốt nghiệp đại học.'
datasets: []
pipeline_tag: sentence-similarity
library_name: sentence-transformers
---

# SentenceTransformer based on sentence-transformers/paraphrase-multilingual-mpnet-base-v2

This is a [sentence-transformers](https://www.SBERT.net) model finetuned from [sentence-transformers/paraphrase-multilingual-mpnet-base-v2](https://huggingface.co/sentence-transformers/paraphrase-multilingual-mpnet-base-v2). It maps sentences & paragraphs to a 768-dimensional dense vector space and can be used for semantic textual similarity, semantic search, paraphrase mining, text classification, clustering, and more.

## Model Details

### Model Description
- **Model Type:** Sentence Transformer
- **Base model:** [sentence-transformers/paraphrase-multilingual-mpnet-base-v2](https://huggingface.co/sentence-transformers/paraphrase-multilingual-mpnet-base-v2) <!-- at revision 4328cf26390c98c5e3c738b4460a05b95f4911f5 -->
- **Maximum Sequence Length:** 128 tokens
- **Output Dimensionality:** 768 tokens
- **Similarity Function:** Cosine Similarity
<!-- - **Training Dataset:** Unknown -->
<!-- - **Language:** Unknown -->
<!-- - **License:** Unknown -->

### Model Sources

- **Documentation:** [Sentence Transformers Documentation](https://sbert.net)
- **Repository:** [Sentence Transformers on GitHub](https://github.com/UKPLab/sentence-transformers)
- **Hugging Face:** [Sentence Transformers on Hugging Face](https://huggingface.co/models?library=sentence-transformers)

### Full Model Architecture

```
SentenceTransformer(
  (0): Transformer({'max_seq_length': 128, 'do_lower_case': False}) with Transformer model: XLMRobertaModel 
  (1): Pooling({'word_embedding_dimension': 768, 'pooling_mode_cls_token': False, 'pooling_mode_mean_tokens': True, 'pooling_mode_max_tokens': False, 'pooling_mode_mean_sqrt_len_tokens': False, 'pooling_mode_weightedmean_tokens': False, 'pooling_mode_lasttoken': False, 'include_prompt': True})
)
```

## Usage

### Direct Usage (Sentence Transformers)

First install the Sentence Transformers library:

```bash
pip install -U sentence-transformers
```

Then you can load this model and run inference.
```python
from sentence_transformers import SentenceTransformer

# Download from the 🤗 Hub
model = SentenceTransformer("sentence_transformers_model_id")
# Run inference
sentences = [
    'Ứng viên thực tập chuyên về CRM, Market Research, TikTok Ads. Đã làm việc với . Tốt nghiệp Đại học Bách Khoa. Tính cách: làm việc nhóm, phân tích vấn đề, quản lý thời gian.',
    'Vị trí Cloud Engineer - Cần người biết Monitoring, Bash, AWS và có kinh nghiệm dưới 2 năm. Thêm điểm nếu có: Load Balancing, Grafana, Ansible.',
    'Tuyển dụng Digital Marketing. Yêu cầu: Content Marketing, Social Media. Ưu tiên: Copywriting, Market Research, CRM. Kinh nghiệm: tốt nghiệp đại học.',
]
embeddings = model.encode(sentences)
print(embeddings.shape)
# [3, 768]

# Get the similarity scores for the embeddings
similarities = model.similarity(embeddings, embeddings)
print(similarities.shape)
# [3, 3]
```

<!--
### Direct Usage (Transformers)

<details><summary>Click to see the direct usage in Transformers</summary>

</details>
-->

<!--
### Downstream Usage (Sentence Transformers)

You can finetune this model on your own dataset.

<details><summary>Click to expand</summary>

</details>
-->

<!--
### Out-of-Scope Use

*List how the model may foreseeably be misused and address what users ought not to do with the model.*
-->

<!--
## Bias, Risks and Limitations

*What are the known or foreseeable issues stemming from this model? You could also flag here known failure cases or weaknesses of the model.*
-->

<!--
### Recommendations

*What are recommendations with respect to the foreseeable issues? For example, filtering explicit content.*
-->

## Training Details

### Training Dataset

#### Unnamed Dataset


* Size: 680 training samples
* Columns: <code>sentence_0</code>, <code>sentence_1</code>, and <code>label</code>
* Approximate statistics based on the first 1000 samples:
  |         | sentence_0                                                                         | sentence_1                                                                         | label                                                           |
  |:--------|:-----------------------------------------------------------------------------------|:-----------------------------------------------------------------------------------|:----------------------------------------------------------------|
  | type    | string                                                                             | string                                                                             | float                                                           |
  | details | <ul><li>min: 44 tokens</li><li>mean: 60.83 tokens</li><li>max: 90 tokens</li></ul> | <ul><li>min: 33 tokens</li><li>mean: 49.12 tokens</li><li>max: 74 tokens</li></ul> | <ul><li>min: 0.0</li><li>mean: 0.18</li><li>max: 0.93</li></ul> |
* Samples:
  | sentence_0                                                                                                                                                                                                                              | sentence_1                                                                                                                                                                                                           | label                            |
  |:----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|:---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|:---------------------------------|
  | <code>Ứng viên fresher chuyên về Kỹ năng bán hàng, Chăm sóc khách hàng, Tìm kiếm khách hàng. Đã làm việc với . Tốt nghiệp Đại học CNTT. Tính cách: chi tiết, sáng tạo, giao tiếp tốt.</code>                                            | <code>Vị trí C&B Specialist - Cần người biết Hợp đồng lao động, BHXH, Đào tạo và có kinh nghiệm 3 năm kinh nghiệm. Thêm điểm nếu có: HRIS, Đánh giá hiệu suất KPI, Payroll.</code>                                   | <code>0.0</code>                 |
  | <code>Kinh nghiệm: senior. Kỹ năng chính: React, HTML, Responsive Design, Next.js, CSS, Webpack, Angular, UI/UX, Figma, Tailwind CSS, Vue.js, Bootstrap. Học vấn: Đại học Kinh tế. Phẩm chất: chi tiết, giao tiếp tốt, sáng tạo.</code> | <code>Tuyển dụng Sales Executive. Yêu cầu: Tìm kiếm khách hàng, Telesales, Kỹ năng bán hàng, Đàm phán, Thuyết trình, KPI doanh số, B2B, Chăm sóc khách hàng, CRM. Ưu tiên: Upselling, B2C. Kinh nghiệm: lead.</code> | <code>0.09574271034651502</code> |
  | <code>Ứng viên từ 3-5 năm chuyên về MySQL, Kubernetes, AWS. Đã làm việc với Laravel, Node.js, Spring Boot. Tốt nghiệp Đại học Bách Khoa. Tính cách: phân tích vấn đề, chịu áp lực cao, cẩn thận.</code>                                 | <code>Chúng tôi tìm kiếm Frontend Engineer (thực tập). Kỹ năng bắt buộc: Vue.js, Responsive Design. Kỹ năng mong muốn: jQuery, React, UI/UX.</code>                                                                  | <code>0.2158401604584236</code>  |
* Loss: [<code>CosineSimilarityLoss</code>](https://sbert.net/docs/package_reference/sentence_transformer/losses.html#cosinesimilarityloss) with these parameters:
  ```json
  {
      "loss_fct": "torch.nn.modules.loss.MSELoss"
  }
  ```

### Training Hyperparameters
#### Non-Default Hyperparameters

- `per_device_train_batch_size`: 32
- `per_device_eval_batch_size`: 32
- `num_train_epochs`: 4
- `multi_dataset_batch_sampler`: round_robin

#### All Hyperparameters
<details><summary>Click to expand</summary>

- `overwrite_output_dir`: False
- `do_predict`: False
- `eval_strategy`: no
- `prediction_loss_only`: True
- `per_device_train_batch_size`: 32
- `per_device_eval_batch_size`: 32
- `per_gpu_train_batch_size`: None
- `per_gpu_eval_batch_size`: None
- `gradient_accumulation_steps`: 1
- `eval_accumulation_steps`: None
- `torch_empty_cache_steps`: None
- `learning_rate`: 5e-05
- `weight_decay`: 0.0
- `adam_beta1`: 0.9
- `adam_beta2`: 0.999
- `adam_epsilon`: 1e-08
- `max_grad_norm`: 1
- `num_train_epochs`: 4
- `max_steps`: -1
- `lr_scheduler_type`: linear
- `lr_scheduler_kwargs`: {}
- `warmup_ratio`: 0.0
- `warmup_steps`: 0
- `log_level`: passive
- `log_level_replica`: warning
- `log_on_each_node`: True
- `logging_nan_inf_filter`: True
- `save_safetensors`: True
- `save_on_each_node`: False
- `save_only_model`: False
- `restore_callback_states_from_checkpoint`: False
- `no_cuda`: False
- `use_cpu`: False
- `use_mps_device`: False
- `seed`: 42
- `data_seed`: None
- `jit_mode_eval`: False
- `use_ipex`: False
- `bf16`: False
- `fp16`: False
- `fp16_opt_level`: O1
- `half_precision_backend`: auto
- `bf16_full_eval`: False
- `fp16_full_eval`: False
- `tf32`: None
- `local_rank`: 0
- `ddp_backend`: None
- `tpu_num_cores`: None
- `tpu_metrics_debug`: False
- `debug`: []
- `dataloader_drop_last`: False
- `dataloader_num_workers`: 0
- `dataloader_prefetch_factor`: None
- `past_index`: -1
- `disable_tqdm`: False
- `remove_unused_columns`: True
- `label_names`: None
- `load_best_model_at_end`: False
- `ignore_data_skip`: False
- `fsdp`: []
- `fsdp_min_num_params`: 0
- `fsdp_config`: {'min_num_params': 0, 'xla': False, 'xla_fsdp_v2': False, 'xla_fsdp_grad_ckpt': False}
- `fsdp_transformer_layer_cls_to_wrap`: None
- `accelerator_config`: {'split_batches': False, 'dispatch_batches': None, 'even_batches': True, 'use_seedable_sampler': True, 'non_blocking': False, 'gradient_accumulation_kwargs': None}
- `deepspeed`: None
- `label_smoothing_factor`: 0.0
- `optim`: adamw_torch
- `optim_args`: None
- `adafactor`: False
- `group_by_length`: False
- `length_column_name`: length
- `ddp_find_unused_parameters`: None
- `ddp_bucket_cap_mb`: None
- `ddp_broadcast_buffers`: False
- `dataloader_pin_memory`: True
- `dataloader_persistent_workers`: False
- `skip_memory_metrics`: True
- `use_legacy_prediction_loop`: False
- `push_to_hub`: False
- `resume_from_checkpoint`: None
- `hub_model_id`: None
- `hub_strategy`: every_save
- `hub_private_repo`: False
- `hub_always_push`: False
- `gradient_checkpointing`: False
- `gradient_checkpointing_kwargs`: None
- `include_inputs_for_metrics`: False
- `eval_do_concat_batches`: True
- `fp16_backend`: auto
- `push_to_hub_model_id`: None
- `push_to_hub_organization`: None
- `mp_parameters`: 
- `auto_find_batch_size`: False
- `full_determinism`: False
- `torchdynamo`: None
- `ray_scope`: last
- `ddp_timeout`: 1800
- `torch_compile`: False
- `torch_compile_backend`: None
- `torch_compile_mode`: None
- `dispatch_batches`: None
- `split_batches`: None
- `include_tokens_per_second`: False
- `include_num_input_tokens_seen`: False
- `neftune_noise_alpha`: None
- `optim_target_modules`: None
- `batch_eval_metrics`: False
- `eval_on_start`: False
- `use_liger_kernel`: False
- `eval_use_gather_object`: False
- `batch_sampler`: batch_sampler
- `multi_dataset_batch_sampler`: round_robin

</details>

### Framework Versions
- Python: 3.12.13
- Sentence Transformers: 3.0.1
- Transformers: 4.45.2
- PyTorch: 2.11.0+cu128
- Accelerate: 1.14.0
- Datasets: 4.0.0
- Tokenizers: 0.20.3

## Citation

### BibTeX

#### Sentence Transformers
```bibtex
@inproceedings{reimers-2019-sentence-bert,
    title = "Sentence-BERT: Sentence Embeddings using Siamese BERT-Networks",
    author = "Reimers, Nils and Gurevych, Iryna",
    booktitle = "Proceedings of the 2019 Conference on Empirical Methods in Natural Language Processing",
    month = "11",
    year = "2019",
    publisher = "Association for Computational Linguistics",
    url = "https://arxiv.org/abs/1908.10084",
}
```

<!--
## Glossary

*Clearly define terms in order to be accessible across audiences.*
-->

<!--
## Model Card Authors

*Lists the people who create the model card, providing recognition and accountability for the detailed work that goes into its construction.*
-->

<!--
## Model Card Contact

*Provides a way for people who have updates to the Model Card, suggestions, or questions, to contact the Model Card authors.*
-->