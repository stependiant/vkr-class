src=main.tex setup.tex Введение.tex Реферат.tex ТехЗадание.tex Анализ.tex ТехПроект.tex ТитульныйЛист.tex ТитульныйЛистПрактика.tex Обозначения.tex РабочийПроект.tex Заключение.tex СписокИсточников.tex Плакаты.tex ЛистЗадания.tex Код.tex vkr.cls

.PHONY: all

all: main.pdf

main.pdf: $(src)
	xelatex $(src)
